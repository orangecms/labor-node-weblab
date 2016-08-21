var can_client = require('./can.js');

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

// prepare objects for fast access
var registerCANCallbacks = function(io, subchannels) {
  for (var i in subchannels) {
    var subchannel = subchannels[i];
    switch (subchannel.type) {
      case 'swt':
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
        break;
      case 'sld':
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
        break;
      case 'graph':
        registerCANCallBack(
          function(data, sub) {
            io.sockets.emit('UpdateGUI', [{'fkt': 'graph', 'dev': sub.id, 'val': data.data[sub.response_byte]}]);
        }, subchannel.lapaddr, subchannel.response_srcport, subchannel);
        break;
    }
  };
}

can_client.on('packet', function(data) {
  for (var i in canCallbacks) {
    canCallbacks[i].cb(data);
  }
});

can_client.on('connected', function() {
  console.log('can connected');
});

var handleCANData = function(data, subchannel) {
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
}

module.exports = {
  registerCANCallbacks: registerCANCallbacks,
  handleCANData: handleCANData,
};
