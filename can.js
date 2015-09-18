var net = require('net');
var conf = require('./config.js');
var can_client;
var rawdata = new Buffer(0);
var bytesRead = 0;

var EventEmitter = require('events').EventEmitter;

module.exports = new EventEmitter();

var connect = function () {
	can_client = net.connect(conf.global.canconfig.port, conf.global.canconfig.hostname, function() { //'connect' listener
		console.log('cand client connected to ' + conf.global.canconfig.hostname + ':' + conf.global.canconfig.port);
		module.exports.emit('connected');
	});
};

connect();

can_client.on('error', function(error) {
	console.log('error: cand connection not possible');
	console.log('could not connect to ' + conf.global.canconfig.hostname + ':' + conf.global.canconfig.port);
	timeoutid = setTimeout(connect, 2000);
});

can_client.on('data', function(data) {
	var len;
	bytesRead += data.length;
	rawdata = Buffer.concat([rawdata, data]);
	//rawdata[0] == len, rawdata[1] == type
	if (bytesRead >= 2) { //header is 2 bytes
		while (bytesRead - 2 >= rawdata[0]) {
			len = rawdata[0];
			ProcessCANPacket(rawdata.slice(0, len + 2));
			bytesRead -= (len + 2);
			rawdata = rawdata.slice(len + 2, rawdata.length)
		}
	}
});

can_client.on('end', function() {
	console.log('can client disconnected');
	timeoutid = setTimeout(connect, 2000);
});

function ProcessCANPacket(packet) {
	switch (packet[1]) {
		case 0x11: // can packet
			var rx_packet = new CANPacket();
			rx_packet.destination_addr = packet[2];
			rx_packet.source_addr = packet[3];
			rx_packet.destination_port = ((packet[4] & 0x60) >> 1) + (packet[4] & 0x0f);
			rx_packet.source_port = ((packet[5] & 0x1f) << 1) + ((packet[4] & 0x80) >> 7);
			rx_packet.dlc = packet[6];
			for (var i = 0; i < rx_packet.dlc; i++) {
				rx_packet.data[i] = packet[7 + i];
			}
			module.exports.emit('packet', rx_packet);
			break;
		case 0x19:
			break;
		case 0x1a:
			break;
		
		default:
			break;
	}
}

var CANPacket = function() {
	this.source_addr = 0;
	this.source_port = 0;
	this.destination_addr = 0;
	this.destination_port = 0;
	this.dlc = 0;
	this.data = new Buffer(8);

	this.senddata = function() {
		var packetlength = this.dlc + 7; // dlc, 4 byte address / port, 2 byte tcp header
		var buffer = new Buffer(packetlength);
		buffer[0] = packetlength - 2; // len - tcp header
		buffer[1] = 0x11; // tcp packet
		buffer[2] = this.destination_addr;
		buffer[3] = this.source_addr;
		buffer[4] = (this.destination_port & 0xf) | ((this.destination_port & 0x30) << 1) | ((this.source_port & 1) << 7);
		buffer[5] = (this.source_port & 0x3e) >> 1;
		buffer[6] = this.dlc;
		for (var i = 0; i < this.dlc; i++) {
			buffer[7 + i] = this.data[i];
		}
		can_client.write(buffer);
	};
};

module.exports.CANPacket = new CANPacket();
exports.can_client = can_client;

