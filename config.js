var fs = require('fs');
var id_counter;
var channels = [];
var rooms = [];
var globalconfig;
var musicconfig;
var config;
var subchannels = [];

var read_config = function () {
	// load room config
	var data = fs.readFileSync('roomconfig.json', 'utf8');
	if (data.length > 0)
	{
		channels.length = 0;
		rooms.length = 0;
		config = JSON.parse(data);
		id_counter = 0;
		// prepare objects for fast access
		for (var i in config.room) {
			var room = config.room[i];
			room.channels = [];
			for (var j in room.devices) {
				var device = room.devices[j];
				for (var k in device.channels) {
					var channel = device.channels[k];
					channel.devicename = device.name;
					for (var l in channel.subchannels) {
						var subchannel = channel.subchannels[l];
						subchannel.id = id_counter++;
						subchannel.lapaddr = device.lapaddr;
						subchannel.device = device;
						subchannels.push(subchannel);
					};
					channels.push(channel);
					room.channels.push(channel);
				};
			};
			rooms.push(room);
		};
	}
        
	data = fs.readFileSync('globalconfig.json', 'utf8');
        if (data.length > 0)
        {
 		globalconfig = JSON.parse(data);
        } 

}
read_config();

var get_subchannel_by_id = function(id) {
	for (var k in channels) {
		var channel = channels[k];
		for (var l in channel.subchannels) {
			var subchannel = channel.subchannels[l];
			if (subchannel.id == id) {
				return subchannel;
			}
		};
	};
}

var get_subchannel_by_response = function(data){
	var subchannels = [];
	if (data.source_addr > 0) { // ignore localhost
		for (var k in channels) {
			var channel = channels[k];
			for (var l in channel.subchannels) {
				var subchannel = channel.subchannels[l];
				if (subchannel.lapaddr == data.source_addr) {
					if (typeof subchannel.response_srcport != "undefined") {
						if (subchannel.response_srcport == data.source_port) {
							subchannels.push(subchannel);
						}
					}
				}
			}
		}
	}
	return subchannels;
}

var get_subchannel_with_value = function(){
	var subchannels = [];
	for (var k in channels) {
		var channel = channels[k];
		for (var l in channel.subchannels) {
			var subchannel = channel.subchannels[l];
			if (typeof subchannel.currentvalue != "undefined") {
				subchannels.push(subchannel);
			}
		}
	}
	return subchannels;
}

fs.watch('./roomconfig.json', function (event, filename) {
	if (event == 'change' && filename) {
		read_config();
		console.log('Configfile ' + filename + ' has ' + event + ' and was reloaded');
	}
});

fs.watch('./globalconfig.json', function (event, filename) {
        if (event == 'change' && filename) {
                read_config();
                console.log('Configfile ' + filename + ' has ' + event + ' and was reloaded');
        }
});

module.exports = {
	channels: channels,
	rooms: rooms,
        global: globalconfig,
	conf: config,
	subchannels: subchannels,
	get_subchannel_by_id: get_subchannel_by_id,
	get_subchannel_by_response: get_subchannel_by_response,
	get_subchannel_with_value: get_subchannel_with_value
};

