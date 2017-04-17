const EventEmitter = require('events').EventEmitter;
const net = require('net');
const CANPacket = require('./canPacket');
const conf = require('../config.js');

const { hostname, port } = conf.global.canconfig;

let client;
module.exports = new EventEmitter();

function processCANPacket(packet) {
  switch (packet[1]) {
    case 0x11: // can packet
      var rx_packet = new CANPacket();
      rx_packet.destination_addr = packet[2];
      rx_packet.source_addr = packet[3];
      rx_packet.destination_port = (
        (packet[4] & 0x60) >> 1
      ) + (
        packet[4] & 0x0f
      );
      rx_packet.source_port = (
        (packet[5] & 0x1f) << 1
      ) + (
        (packet[4] & 0x80) >> 7
      );
      rx_packet.dlc = packet[6];
      for (var i = 0; i < rx_packet.dlc; i++) {
        rx_packet.data[i] = packet[7 + i];
      }
      module.exports.emit('packet', rx_packet);
      break;
    case 0x19:
    case 0x1a:
    default:
      break;
  }
}

const handleCANData = function(data) {
  let len = 0;
  let bytesRead = data.length;
  let rawdata = new Buffer(0);
  rawdata = Buffer.concat([rawdata, data]);
  //rawdata[0] == len, rawdata[1] == type
  if (bytesRead >= 2) { //header is 2 bytes
    while (bytesRead - 2 >= rawdata[0]) {
      len = rawdata[0];
      processCANPacket(rawdata.slice(0, len + 2));
      bytesRead -= (len + 2);
      rawdata = rawdata.slice(len + 2, rawdata.length)
    }
  }
};

//'connect' listener
const onConnect = function() {
  console.log(`[CAN] client connected to ${hostname}:${port}`);
};

const connect = function () {
  client = net.connect(port, hostname, onConnect);
  module.exports.client = client;
};
connect();

const reconnect = () => {
  timeoutid = setTimeout(connect, 2000);
};

client.on('data', handleCANData);

client.on('error', function(error) {
  console.log(`[CAN] could not connect to ${hostname}:${port}`);
  reconnect();
});

client.on('end', function() {
  console.log(`[CAN] client disconnected`);
  reconnect();
});
