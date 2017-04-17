const CANPacket = function() {
  this.source_addr = 0;
  this.source_port = 0;
  this.destination_addr = 0;
  this.destination_port = 0;
  // Digital Loop Carrier
  this.dlc = 0;
  this.data = new Buffer(8);

  this.senddata = function(canClient) {
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
    console.log('[CAN] sending', buffer);
    canClient.write(buffer);
  };
};

module.exports = CANPacket;
