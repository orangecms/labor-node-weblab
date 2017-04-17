const EventEmitter = require('events').EventEmitter;
const net = require('net');
const conf = require('./config.js');

const { hostname, port } = conf.global.canconfig;

const CANPacket = function() {
  this.source_addr = 0;
  this.source_port = 0;
  this.destination_addr = 0;
  this.destination_port = 0;
  // Digital Loop Carrier
  this.dlc = 0;
  this.data = new Buffer(8);

  this.senddata = function() {
    var packetlength =
      this.dlc + 7; // dlc, 4 byte address / port, 2 byte tcp header
    var buffer = new Buffer(packetlength);
    buffer[0] = packetlength - 2; // len - tcp header
    buffer[1] = 0x11; // tcp packet
    buffer[2] = this.destination_addr;
    buffer[3] = this.source_addr;
    buffer[4] = (
      this.destination_port & 0xf
    ) | (
      (this.destination_port & 0x30) << 1
    ) | (
      (this.source_port & 1) << 7
    );
    buffer[5] = (this.source_port & 0x3e) >> 1;
    buffer[6] = this.dlc;
    for (var i = 0; i < this.dlc; i++) {
      buffer[7 + i] = this.data[i];
    }
    console.log('[CAN] actually sending', buffer);
    can_client.write(buffer);
  };
};

module.exports = new EventEmitter();
module.exports.CANPacket = CANPacket;

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

//'connect' listener
const onConnect = function() {
  console.log(`[CAN] client connected to ${hostname}:${port}`);
};

let can_client;
const connect = function () {
  can_client = net.connect(port, hostname, onConnect);
};
connect();

const reconnect = () => {
  timeoutid = setTimeout(connect, 2000);
};

can_client.on('data', function(data) {
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
});

can_client.on('error', function(error) {
  console.log(`[CAN] could not connect to ${hostname}:${port}`);
  reconnect();
});

can_client.on('end', function() {
  console.log(`[CAN] client disconnected`);
  reconnect();
});
