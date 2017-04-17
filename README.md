# node-weblab
Our hackerspace home automation nodejs base

= How to use =

Simply edit globalconfig.json and call npm install.
For mpd functionality add your own roomconfig.json

## `roomconfig.json`

### Room
A room has a `name` (string) and `devices`.

#### Devices
A device has a `lapaddr` (integer), a `name` (string) and `channels`.
In case of MPD, the name is `Musik` and the device has the additional
fields `host` (string) and `port` (integer).

##### Channels
A channel has a `name` (string) and `subchannels`.

###### Subchannels
A subchannel has a `type`, a `port`, `data0`/`data1`, an `action`,
and optionally some of the following:
- `response_srcport`
- `response_bit`
- `response_byte`
- `response_mask`
- `response_result`
- `image` (for some subchannels of type `btn`)

####### Subchannel types
- text: text
- swt: switch
- btn: button
- sld: slider
