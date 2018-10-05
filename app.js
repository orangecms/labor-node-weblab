var conf = require('./config.js');
var http = require('./http.js');
var io = require('socket.io').listen(http.server);
var mpd = require('mpd'),
    cmd = mpd.cmd;
var cand = require('./can'),
    registerCANCallbacks = cand.registerCANCallbacks,
    handleCANData = cand.handleCANData;

//io.enable('browser client minification');  // send minified client
//io.enable('browser client etag');          // apply etag caching logic based on version number
//io.enable('browser client gzip');          // gzip the file
//io.set('log level', 1);                    // reduce logging

for (var i in conf.rooms) {
  var room = conf.rooms[i];
  for (var j in room.devices) {
    var device = room.devices[j];
    if (device.name == "Musik") {
      console.log("trying " + device.host + " : " + device.port);
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

registerCANCallbacks(io, conf.subchannels);

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

    handleCANData(data, subchannel);

    //io.sockets.emit('message', data);
  });
});

process.on('exit', function () {
  //netvar_client.terminate();
  console.log('exit');
});

process.on('SIGINT', function () {
  console.log('Got SIGINT.');
  process.exit();
});
