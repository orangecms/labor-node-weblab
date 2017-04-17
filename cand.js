const can_client = require('./can.js');
const { CANPacket } = can_client;

const canCallbacks = [];

const registerCANCallBack = (subchannel, onReceivePacket) => {
  canCallbacks.push({
    addr: subchannel.lapaddr,
    port: subchannel.response_srcport,
    sub: subchannel,
    onReceivePacket: function(data) {
      if (
        data.source_addr == this.addr &&
        data.source_port == this.port
      ) {
        //console.log("addr = " + this.addr + " port " + this.port);
        onReceivePacket(data, this.sub);
      }
    }
  });
}

const handleSwitch = updateUI => function(data, sub) {
  const byte_indx = parseInt(sub.response_bit / 8);
  if (data.dlc > byte_indx) {
    sub.currentvalue =
      data.data[byte_indx] &
      (1 << (sub.response_bit % 8));
    updateUI({ type: 'sw', id: sub.id, value: sub.currentvalue });
    console.log(
     `[CAN] emitting packet ${sub.id} val ${sub.currentvalue}`
    );
  }
};

const handleSlider = updateUI => function(data, sub) {
  if (data.dlc > sub.response_byte) {
    sub.currentvalue = data.data[sub.response_byte];
    updateUI({ type: 'sl', id: sub.id, value: sub.currentvalue });
  }
};

const handleGraph = updateUI => function(data, sub) {
  const value = data.data[sub.response_byte];
  updateUI({ type: 'graph', id: sub.id, value });
};

// prepare objects for fast access
var registerCANCallbacks = function(subchannels, updateUI) {
  subchannels.forEach((subchannel) => {
    switch (subchannel.type) {
      case 'swt':
        registerCANCallBack(subchannel, handleSwitch(updateUI));
        break;
      case 'sld':
        registerCANCallBack(subchannel, handleSlider(updateUI));
        break;
      case 'graph':
        registerCANCallBack(subchannel, handleGraph(updateUI));
        break;
    }
  });
}

can_client.on('packet', function(data) {
  canCallbacks.forEach(canCallback => canCallback.onReceivePacket(data));
});

const handleCANData = function(data, subchannel) {
  const packet = new CANPacket();
  packet.source_addr = 0;
  packet.destination_addr = subchannel.lapaddr;
  packet.source_port = subchannel.port;
  packet.destination_port = subchannel.port;
  packet.dlc = 0;
  if (typeof subchannel.data0 != "undefined") {
    packet.data[0] = (
      data.fkt == 'lock' ? subchannel.data0 + 1 : subchannel.data0
    );
    packet.dlc += 1;
  }
  if (typeof subchannel.data1 != "undefined") {
    packet.data[1] = subchannel.data1;
    packet.dlc += 1;
  }
  if (typeof subchannel.data2 != "undefined") {
    packet.data[2] = subchannel.data2;
    packet.dlc += 1;
  }
  if (typeof subchannel.data3 != "undefined") {
    packet.data[3] = subchannel.data3;
    packet.dlc += 1;
  }
  if (typeof subchannel.data4 != "undefined") {
    packet.data[4] = subchannel.data4;
    packet.dlc += 1;
  }
  if (typeof subchannel.action != "undefined") {
    packet.data[parseInt(subchannel.action)] = parseInt(data.val);
    const minDlc = parseInt(subchannel.action) + 1;
    if (packet.dlc < minDlc) {
      packet.dlc = minDlc;
    }
  }
  console.log('[CAN] sending', packet.data);
  packet.senddata();
  delete packet;
}

module.exports = {
  registerCANCallbacks,
  handleCANData,
};
