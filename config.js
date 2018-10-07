var fs = require('fs');
var id_counter;
var channels = [];
var rooms = [];
var globalconfig;
var config;
var subchannels = [];

const read_config = () => {
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
  if (data.length > 0) {
    globalconfig = JSON.parse(data);
  }
}

read_config();

const get_subchannel_by_id = id => subchannels.find(
  // FIXME: '==' because ID is not being parsed as string
  ({ id: subchannelId }) => subchannelId == id
);

const get_subchannel = ({
  roomName,
  deviceName,
  channelName,
  subchannelNameOrType
}) => {
  const room = rooms.find(({ name }) => name === roomName);
  if (!room) return;
  const device = room.devices.find(
    ({ name }) => name === deviceName
  );
  if (!device) return;
  const channel = device.channels.find(
    ({ name }) => name === channelName
  );
  if (!channel) return;
  const subchannel = channel.subchannels.find(
    ({ name, type }) => [name, type].includes(subchannelNameOrType)
  );
  return subchannel;
};

const get_subchannel_by_response = ({
  source_addr,
  source_port,
}) => {
  const subChannels = [];
  if (
    source_addr > 0 && // ignore localhost
    typeof source_port !== 'undefined'
  ) {
    subchannels.forEach((subchannel) => {
      if (
        subchannel.lapaddr === source_addr &&
        subchannel.response_srcport === source_port
      ) {
        subChannels.push(subchannel);
      }
    });
  }
  return subChannels;
}

const get_subchannel_with_value = () => {
  const subChannels = [];
  subchannels.forEach((subchannel) => {
    if (typeof subchannel.currentvalue !== 'undefined') {
      subChannels.push(subchannel);
    }
  });
  return subChannels;
};

const configFileWatcher = (event, filename) => {
  if (event === 'change' && filename) {
    read_config();
    console.log(
      `Configfile ${filename} has ${event} and was reloaded`
    );
  }
};

const configFiles = [
  './roomconfig.json',
  './globalconfig.json',
];

configFiles.forEach(
  file => fs.watch(file, configFileWatcher)
);

module.exports = {
  channels,
  rooms,
  global: globalconfig,
  conf: config,
  subchannels,
  get_subchannel,
  get_subchannel_by_id,
  get_subchannel_by_response,
  get_subchannel_with_value,
};

