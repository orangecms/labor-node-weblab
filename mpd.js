const mpd = require('mpd');
const { cmd, connect } = mpd;

const emptyStatusCmd = cmd('status', []);
const emptyStatusCb = (err, msg) => {
  if (err) {
    throw err;
  }
  console.log(msg);
};

const mpdConnect = (device) => {
  const { host, port } = device;
  const connectionString = `${host}:${port}`;
  console.log(`[MPD] Trying ${connectionString}...`);
  const client = connect({ port, host });
  device.mpdclient = client;

  client.on('error', () => {
    console.error(`[MPD] Error: Couldn't connect! Please check MPD server.`);
  });

  client.on('ready', function() {
    console.log(`[MPD] ${connectionString} ready`);
    this.sendCommand(
      cmd('currentsong', []),
      function(err, msg) {
        const currentSongInfo = msg.split('\n').filter(
          line => (
            line.indexOf('Title:') === 0 ||
            line.indexOf('Album:') === 0 ||
            line.indexOf('Artist:') === 0
          )
        ).join('\n');
        device.currentsonginfo = currentSongInfo;
        console.log(`[MPD] ${currentSongInfo}`);
      }
    );
    this.sendCommand(emptyStatusCmd, emptyStatusCb);
  });

  client.on('system-player', function() {
    this.sendCommand(emptyStatusCmd, emptyStatusCb);
  });

  client.on('system-mixer', function() {
    // TODO
  });
};

/**
 *
 */
const mpdCommandCb = function(err, msg) {
  if (err) {
    console.log(`[MPD] error ${err}`);
    return;
  }
  console.log(`[MPD] ${msg}`);
};

/**
 *
 */
const setMpdValue = (subchannel, value) => {
  console.log(`[MPD] cmd: ${subchannel.action}, val: ${value}`);
  const mpdarg = (typeof val !== 'undefined')
    ? [parseInt(value * 100 / 255)]
    : [];
  const command = cmd(subchannel.action, mpdarg);
  subchannel.device.mpdclient.sendCommand(command, mpdCommandCb);
};

module.exports = {
  mpdConnect,
  setMpdValue,
};
