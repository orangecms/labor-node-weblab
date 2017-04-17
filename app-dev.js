const conf = require('./config');
const http = require('./http');
const io = require('socket.io').listen(http.server);
const { mpdConnect, setMpdValue } = require('./mpd');
const { registerCANCallbacks, sendCANData } = require('./can');

//io.enable('browser client minification');  // send minified client
//io.enable('browser client etag');          // apply etag caching logic based on version number
//io.enable('browser client gzip');          // gzip the file
//io.set('log level', 1);                    // reduce logging

conf.rooms.forEach(room => room.devices.filter(
  device => device.name === 'Musik'
).forEach(mpdConnect)); // FIXME: has side-effects

const updateUI = ({ type, id, value }) => io.emit(
  'UpdateGUI',
  [{
    fkt: type,
    dev: id,
    val: value,
  }]
);

registerCANCallbacks(conf.subchannels, updateUI);

io.sockets.on('connection', function (socket) {
  console.log('[GUI] new connection');
  socket.on('GetStat', function (data) {
    const clientChannels = [];
    conf.get_subchannel_with_value().forEach((subchannel) => {
      const { type, id, currentvalue } = subchannel;
      switch (type) {
        case 'swt':
          clientChannels.push({ fkt: 'sw', dev: id, val: currentvalue });
          break;
        case 'sld':
          clientChannels.push({ fkt: 'sl', dev: id, val: currentvalue });
          break;
        default:
          break;
      }
    });
    socket.emit('UpdateGUI', clientChannels);
  });

  socket.on('SetValue', (data) => {
    console.log(`[GUI] -> node: ${data.fkt} ${data.dev} ${data.val}`);
    const subchannel = conf.get_subchannel_by_id(data.dev);
    if (typeof subchannel === 'undefined') {
      console.error(`could not find subchannel with id ${data.dev}`);
      return;
    }
    // MPD packet
    if (subchannel.lapaddr < 0 ) {
      setMpdValue(subchannel, data);
      return;
    }
    // CAN packet
    sendCANData(subchannel, data);
  });
});

process.on('exit', function () {
  console.log('exit');
});

process.on('SIGINT', function () {
  console.log('Got SIGINT.');
  process.exit();
});
