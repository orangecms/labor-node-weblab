var conf = require('./config.js');
var can_client = require('./can.js');
var http = require('./http.js');
var io = require('socket.io').listen(http.server);
var mpd = require('mpd'),
    cmd = mpd.cmd;

//io.enable('browser client minification');  // send minified client
//io.enable('browser client etag');          // apply etag caching logic based on version number
//io.enable('browser client gzip');          // gzip the file
//io.set('log level', 1);                    // reduce logging
var canCallbacks = [];

var registerCANCallBack = function(callback, sourceaddress, sourceport, subchannel) {
  canCallbacks.push({
    addr: sourceaddress,
    port: sourceport,
    sub: subchannel,
    callback: callback,
    cb: function(data) {
      if (data.source_addr == this.addr && data.source_port == this.port) {
        //console.log("addr = " + this.addr + " port " + this.port);
        this.callback(data, this.sub);
      }
    }
  });
}

can_client.on('packet', function(data) {
  for (var i in canCallbacks) {
    canCallbacks[i].cb(data);
  }
});

for (var i in conf.rooms) {
  var room = conf.rooms[i];
  for (var j in room.devices) {
    var device = room.devices[j];
    if (device.name == "Musik") {
      console.log("trying " + device.host + " : " + device.port);
      var host = device.host;
      var port = device.port;
      var client = mpd.connect({
        port: device.port,
        host: device.host,
      });

      device.mpdclient = client;

      client.on('error', function(err) {
        console.log("Error couldn't connect to mpd! Please check mpd server");
      });

      client.on('ready', function() {
        console.log("ready");
        this.sendCommand(cmd("currentsong", []), function(err, msg) {
          var lines = msg.split('\n');
          var currentsonginfo = "";
          for (var i in lines) {
            var line = lines[i];
            if (line.indexOf("Title:") == 0) currentsonginfo += line + "\n";
            if (line.indexOf("Album:") == 0) currentsonginfo += line + "\n";
            if (line.indexOf("Artist:") == 0) currentsonginfo += line + "\n";
          }
          device.currentsonginfo = currentsonginfo;
          console.log(currentsonginfo);
        });
        this.sendCommand(cmd("status", []), function(err, msg) {
          if (err) throw err;
          console.log(msg);
        });
      });

      client.on('system-player', function() {
        this.sendCommand(
          cmd("status", []),
          function(err, msg) {
            if (err) throw err;
            console.log(msg);
          }
        );
      });

      client.on('system-mixer', function() {

      });
    }
  }
}

// prepare objects for fast access
for (var i in conf.subchannels)
{
  var subchannel = conf.subchannels[i];
  if (subchannel.type == "swt") {
    registerCANCallBack(
      function(data, sub) {
        var byte_indx = parseInt(sub.response_bit / 8);
        if (data.dlc > byte_indx) {
          sub.currentvalue = data.data[byte_indx] & (1<<(sub.response_bit%8));
          io.emit('UpdateGUI', [{'fkt': 'sw', 'dev': sub.id, 'val': sub.currentvalue}]);
          console.log("emitting packet " + sub.id + " val " + sub.currentvalue);
        }
      },
      subchannel.lapaddr,
      subchannel.response_srcport,
      subchannel
    );
  } else if (subchannel.type == "sld") {
    registerCANCallBack(
      function(data, sub) {
        if (data.dlc > sub.response_byte) {
          sub.currentvalue = data.data[sub.response_byte];
          io.emit('UpdateGUI', [{'fkt': 'sl', 'dev': sub.id, 'val': sub.currentvalue}]);
        }
      },
      subchannel.lapaddr,
      subchannel.response_srcport,
      subchannel
    );
  } else if (subchannel.type == "graph") {
    registerCANCallBack(
      function(data, sub) {
        io.sockets.emit('UpdateGUI', [{'fkt': 'graph', 'dev': sub.id, 'val': data.data[sub.response_byte]}]);
    }, subchannel.lapaddr, subchannel.response_srcport, subchannel);
  }
};

io.sockets.on('connection', function (socket) {
  console.log("new connection");

  socket.on('GetStat', function (data) {
    var subchannels = conf.get_subchannel_with_value();
    var clientChannels = [];
    for (var i in subchannels) {
      var subchannel = subchannels[i];
      if (subchannel.type == "swt") {
        clientChannels.push({
          fkt: 'sw',
          dev: subchannel.id,
          val: subchannel.currentvalue
        });
      }
      if (subchannel.type == "sld") {
        clientChannels.push({
          fkt: 'sl',
          dev: subchannel.id,
          val: subchannel.currentvalue
        });
      }
    }
    socket.emit('UpdateGUI', clientChannels);
  });

  socket.on('SetValue', function (data) {
    console.log("GUI -> node: " + data.fkt + " " + data.dev + " " + data.val);
    var subchannel = conf.get_subchannel_by_id(data.dev);
    if (typeof subchannel == "undefined") {
      console.log("could not find subchannel with id " + data.dev);
      return;
    }
    //mpd packet
    if (subchannel.lapaddr < 0 ) {
      var mpdarg = [];
      if (typeof data.val != "undefined") {
        mpdarg = [parseInt(data.val * 100 / 255)];
      }
      console.log("cmd:" + subchannel.action + " arg: " + typeof mpdarg + "dataval " + data.val);

      subchannel.device.mpdclient.sendCommand(
        cmd(subchannel.action, mpdarg),
        function(err, msg) {
          if (err) console.log("mpd error " + err);
          console.log(msg);
        }
      );
      return;
    }

    var CANPacket = can_client.CANPacket;
    CANPacket.source_addr = 0;
    CANPacket.destination_addr = subchannel.lapaddr;
    CANPacket.source_port = subchannel.port;
    CANPacket.destination_port = subchannel.port;
    CANPacket.dlc = 0;
    if (typeof subchannel.data0 != "undefined") {
      CANPacket.data[0] = (data.fkt == 'lock' ? subchannel.data0 + 1 : subchannel.data0);
      CANPacket.dlc += 1;
    }
    if (typeof subchannel.data1 != "undefined") {
      CANPacket.data[1] = subchannel.data1;
      CANPacket.dlc += 1;
    }
    if (typeof subchannel.data2 != "undefined") {
      CANPacket.data[2] = subchannel.data2;
      CANPacket.dlc += 1;
    }
    if (typeof subchannel.data3 != "undefined") {
      CANPacket.data[3] = subchannel.data3;
      CANPacket.dlc += 1;
    }
    if (typeof subchannel.data4 != "undefined") {
      CANPacket.data[4] = subchannel.data4;
      CANPacket.dlc += 1;
    }
    if (typeof subchannel.action != "undefined") {
      CANPacket.data[parseInt(subchannel.action)] = parseInt(data.val);
      if (CANPacket.dlc < parseInt(subchannel.action) + 1) {
        CANPacket.dlc = parseInt(subchannel.action) + 1;
      }
    }
    CANPacket.senddata();
    delete CANPacket;
    //io.sockets.emit('message', data);

  });
});

can_client.on('connected', function() {
  console.log('can connected');
});

process.on('exit', function () {
  //netvar_client.terminate();
  console.log('exit');
});

process.on('SIGINT', function () {
  console.log('Got SIGINT.');
  process.exit();
});
