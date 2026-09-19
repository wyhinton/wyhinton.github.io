---
layout: post
title: "Using an ENTTEC DMX USB with ChamSys MagicQ"
date: 2026-09-18
categories: [lighting, dmx, hardware]
tags: [magicq, chamsys, art-net, enttec, dmxking, wireshark, typescript, macos]
excerpt: "Bridging MagicQ's Art-Net output to a USB DMX widget that speaks the ENTTEC DMX USB PRO API: the serial framing, two problems that kept data from reaching the fixture, and the converter fork that implements it."
---

I've recently decided to try to move away from QLC to the other major free, cross-platform lighting software, ChamSys MagicQ. After being on QLC 4 for many years now, I was disappointed to see that despite being in a 5.2 release, the newest version of QLC seems far from ready for production. The new 3D visualizer is impressive, but QLC lacks too many basic workflow features to be of much use on anything but the simplest of setups.

I'd had my handy (discontinued) DMXking UltraDMX Micro for a while and was determined to get it to work with MagicQ instead of buying one of their proprietary dongles. I had a very difficult time trying to work out, from various years-old Reddit and Control Booth threads, whether ENTTEC-based USB DMX converters like mine were supported by MagicQ. Some posts seemed to suggest that for Windows I needed a mysterious set of drivers, or that only MagicQ's proprietary USB interface would work, or that I needed an Art-Net node, or that ENTTEC was supported but not on M1 Macs.

After trying everything I could think of to get it working within MagicQ, I found this awesome [artnet-usbdmx-converter](https://github.com/rainloreley/artnet-usbdmx-converter) project by rainloreley for piping Art-Net from MagicQ to a USB DMX device. I was able to get Claude to add support for ENTTEC devices fairly easily by pointing it at QLC's open-source implementation.

This worked and I was able to get the pipeline up, but it was incredibly laggy. Despite the MagicQ UI remaining fluid and my Mac's fans staying off, the MagicQ process was frequently exceeding 100% CPU usage. What ended up fixing this was setting the Art-Net output to Broadcast instead of Unicast 127.0.0.1, which is the opposite of what every source I found online recommended to improve performance!

Find an AI-generated technical writeup below that digs into some of the details, or try it yourself: [wyhinton/artnet-usbdmx-converter](https://github.com/wyhinton/artnet-usbdmx-converter) (fork of the upstream project, MIT-licensed).

### Technical Writeup

ChamSys MagicQ outputs DMX over the network as Art-Net (UDP). An ENTTEC DMX USB PRO-style widget is a serial device that expects its own framing over a virtual COM port. Connecting the two requires a program that receives Art-Net and writes the universe to the widget.

This post documents that bridge: an extension of the open-source [artnet-usbdmx-converter](https://github.com/rainloreley/artnet-usbdmx-converter), the protocol details, and the two problems that had to be fixed before MagicQ data reached the fixture.



## Setup

| Part | Detail |
| --- | --- |
| Console | ChamSys MagicQ, universe 1 output set to Art-Net |
| Interface | DMXKing.com "USB DMX PRO" (FTDI, USB ID `0403:6001`), speaks the ENTTEC DMX USB PRO API |
| Host | Apple Silicon Mac, macOS 26, Node 18. MagicQ and the converter run on the same machine |
| Converter | Fork of `rainloreley/artnet-usbdmx-converter` with a serial driver for the PRO protocol |

Data path:

```text
MagicQ (universe 1, Art-Net output)
   |  ArtDmx, UDP 6454, 512 slots
   v
dmxnet receiver          net 0 / sub-net 0 / universe 0, bound to 0.0.0.0
   |  'data' event -> number[512]
   v
ConvertHandler.handleIncomingArtNetData
   |  skip the frame if identical to the previous one
   v
EnttecProInterface.writeMap
   |  7E 06 <len> 00 <512 slots> E7
   v
serialport -> /dev/tty.usbserial-XXXXXXXX -> FTDI -> widget -> DMX512 out
```

## Why the original converter did not see the device

The upstream project only supports HID devices from a fixed VID/PID list (FX5, Digital Enlightenment USB-DMX, Nodle U1/R4S), all built on the `usbdmx` driver. A PRO-style widget appears to the OS as an FTDI virtual serial port instead, so it never showed up in the interface picker.

macOS lists the device as `DMX USB PRO` with `idVendor = 1027` (0x0403) and `idProduct = 24577` (0x6001). Enumerating it with the `serialport` package:

```js
const { SerialPort } = require("serialport");
SerialPort.list().then(console.log);
```

```js
{
  path: '/dev/tty.usbserial-XXXXXXXX',
  manufacturer: 'DMXking.com',
  serialNumber: 'XXXXXXXX',
  locationId: '00120000',
  vendorId: '0403',
  productId: '6001'
}
```

The unit used here identifies as DMXKing rather than ENTTEC. DMXKing widgets implement ENTTEC's published DMX USB PRO API, so the same driver covers both.

## The DMX USB PRO protocol

Output uses the "Output Only Send DMX Packet Request" message (label `0x06`):

| Offset | Value | Meaning |
| --- | --- | --- |
| 0 | `0x7E` | start of message |
| 1 | `0x06` | label: send DMX packet |
| 2 | `0x01` | data length, LSB (513 = `0x0201`) |
| 3 | `0x02` | data length, MSB |
| 4 | `0x00` | DMX start code |
| 5 to 516 | 0 to 255 | slots 1 to 512 |
| 517 | `0xE7` | end of message |

A full universe is always 518 bytes. The driver output for a universe with slot 1 = 255, slot 2 = 128, slot 3 = 64 and slot 512 = 7 (captured from the compiled driver with the serial port stubbed out):

```text
7e 06 01 02 00 ff 80 40 ... 00 07 e7      (518 bytes)
```

Port settings: 250000 baud, 8 data bits, 2 stop bits, no parity, no hardware flow control, RTS cleared after the port opens. These match what QLC+ uses for the same widget.

```ts
this.port = new SerialPort({
    path,
    baudRate: 250000,
    dataBits: 8,
    stopBits: 2,
    parity: "none",
    rtscts: false,
    autoOpen: false
});
```

```ts
const dataLength = this.dmxout.length + 1;      // +1 for the start code
const frame = Buffer.alloc(5 + dataLength);
frame[0] = 0x7e;                                // start of message
frame[1] = 0x06;                                // send DMX packet
frame[2] = dataLength & 0xff;
frame[3] = (dataLength >> 8) & 0xff;
frame[4] = 0x00;                                // DMX start code
for (let i = 0; i < this.dmxout.length; i++) {
    frame[5 + i] = this.dmxout[i];
}
frame[frame.length - 1] = 0xe7;                 // end of message
this.port.write(frame);
```

`writeMap` rejects any array that is not exactly 512 entries and logs a warning rather than writing a short frame.

### How it plugs into the converter

- `IDMXInterface` is a shared contract (`write`, `writeMap`, `setMode`, `close`, `getModeDescription`) implemented by both the existing HID `DMXInterface` and the new `EnttecProInterface`.
- `getConnectedInterfaces()` is now async. It merges HID devices with serial ports whose VID/PID appear in `ENTTEC_SERIAL_INTERFACES` (currently `0x0403:0x6001`). Each detected entry carries `protocol: "hid" | "enttec-serial"`.
- `ConvertHandler.openInterface` selects the driver from that field.
- The HID "mode" prompt is skipped for serial interfaces. The PRO widget has no mode concept here; it is always PC Out to DMX Out.

## Problem 1: the converter transmitted on the same universe

**Symptom.** In MagicQ's View DMX I/O, universe 1 was set to output over Art-Net. The In Last Rx column showed changing values and the Status column read `En Cfclt`, yet nothing reached the interface and `--debug` printed no DMX values.

**Cause.** The converter always started both a dmxnet receiver and a dmxnet sender. The sender exists for the reverse direction (USB DMX input to Art-Net output). With the default config it:

- broadcasts to `255.255.255.255`
- uses net 0 / sub-net 0 / universe 0, the same address the receiver listens on
- re-sends an ArtDmx frame every `base_refresh_interval` (1000 ms), all zeros when there is nothing to forward

The PRO driver has no DMX input, so this traffic carried no information. It arrived on the same universe as MagicQ's output and was also received by the converter's own receiver: the `ArtNet In` counter ticked once per second with no console traffic at all.

**Fix.** The sender is only started for interfaces that support DMX input:

```ts
const selectedInterfaceInfo = defaultConvertHandler.availableInterfaces
    .find((e) => e.serial === selectedInfo.serial);
const supportsUSBDMXInput = selectedInterfaceInfo?.protocol !== "enttec-serial";
defaultConvertHandler.startArtNetReceiver(supportsUSBDMXInput);
```

After the change `ArtNet In` stayed at 0 until real traffic arrived. This was necessary but not sufficient: data still did not reach the widget until Problem 2 was fixed.

## Problem 2: MagicQ was sending to 2.255.255.255

**Diagnosis.** With no frames arriving at the converter, the next step was to look at what MagicQ was actually putting on the wire. Wireshark on `en0`, filtered to Art-Net traffic (UDP port 6454) and exported via File > Export Packet Dissections > As CSV:

```text
No.  Time      Source         Destination    Protocol      Length  Info
15   0.539561  192.168.0.157  2.255.255.255  DMX Channels  572     ArtDMX Seq=16 Port=0 Univ=0
28   1.080284  192.168.0.157  2.255.255.255  ARTNET        56      ArtPoll Prio=DpAll
52   1.526682  192.168.0.157  2.255.255.255  DMX Channels  572     ArtDMX Seq=17 Port=0 Univ=0
78   2.518895  192.168.0.157  2.255.255.255  DMX Channels  572     ArtDMX Seq=18 Port=0 Univ=0
```

What the capture shows:

- **Source** is the Mac's own LAN address, so MagicQ and the converter share a host.
- **Universe** is 0, which matches the converter's default receiver address (net 0 / sub-net 0 / universe 0).
- **Destination** is `2.255.255.255`. That is neither the LAN's directed broadcast (`192.168.0.255`) nor the limited broadcast (`255.255.255.255`). It is the broadcast address of the `2.0.0.0/8` range from Art-Net's original addressing scheme.
- **Size** is 572 bytes: 512 slots + 18-byte ArtDmx header + 42 bytes of Ethernet/IPv4/UDP headers.
- **Idle rate** is one ArtDmx frame per second (sequence +1 each time), plus an ArtPoll roughly every 2.5 s.

A UDP probe sent to `2.255.255.255` from the same machine never reached a local listener, while a probe sent to the Mac's LAN address arrived immediately. The converter's receiver binds to `0.0.0.0` and was fine; the packets simply were not addressed to anything it receives.

MagicQ's network settings were correct for the LAN at that point (IP `192.168.0.157`, mask `255.255.255.0`, Art-Net type Normal, Unicast options Fast), so this was not a misconfigured interface. The output destination had to be changed instead.

**Working state.** A later capture, taken with data flowing, shows the same source sending ArtDmx to `192.168.0.255`, the directed broadcast of the `/24`:

```text
No.  Time      Source         Destination    Protocol      Length  Info
10   0.035515  192.168.0.157  192.168.0.255  DMX Channels  572     ArtDMX Seq=130 Port=0 Univ=0
```

Sending unicast to the converter host's own address is the other way to get the packets delivered.

## Running it

```bash
git clone https://github.com/wyhinton/artnet-usbdmx-converter.git
cd artnet-usbdmx-converter
yarn
yarn dev            # build and run
yarn dev --debug    # same, with a pipeline trace
```

Select the entry labelled `<manufacturer> USB DMX PRO (Enttec protocol) (<serial>)`. The mode prompt is skipped.

To skip the picker on later runs, generate the interface block with `outputconfig` and pass the file with `--config=<path>`. See the README for the full config schema.

Notes:

- **macOS firewall.** The app asks for incoming-connection permission for `node`. Blocked incoming UDP produces the same symptom as wrong addressing.
- **Linux.** No udev rule is needed for the serial path. Add the user to `dialout` (`sudo usermod -a -G dialout $USER`) and log in again.

## Capturing Art-Net on macOS

Wireshark on macOS fails with `(cannot open BPF device) /dev/bpf0: Permission denied` until the BPF permissions are installed. The installer ships inside the app bundle:

```bash
sudo installer -pkg "/Applications/Wireshark.app/Contents/Resources/Extras/Install ChmodBPF.pkg" -target /
```

Log out and back in afterwards so the session picks up the `access_bpf` group. Without that step, a capture can be taken directly and opened later:

```bash
sudo tcpdump -i en0 udp port 6454 -w artnet.pcap
```

Export Packet Dissections stays greyed out while a capture is running; stop the capture first.

## Debug mode

`--debug` prints a tagged, timestamped trace of every stage a frame passes through, and replaces the live dashboard (which clears the terminal every second).

| Tag | Emitted |
| --- | --- |
| `ARTNET-IN` | for every ArtDmx frame that reaches the receiver |
| `DEDUP` | when a frame is forwarded, skipped as identical to the previous one, or dropped because the interface is not ready |
| `WRITE` | with all 512 `ChN=value` pairs before each interface write, plus a write summary |
| `LIFECYCLE` | on interface scan, open, ready and close |
| `HID-IN`, `USBDMX-IN`, `ARTNET-OUT` | for the reverse direction (HID interfaces only) |

Failures that would otherwise be silent (a non-512 array, an out-of-range channel or value, a non-zero write result) always print a warning, with or without `--debug`.

The trace is written synchronously on the write path, and the `WRITE` line is a 512-entry dump. Latency with `--debug` on has not been measured; it is intended for verifying wiring, not for running a show.

## Limitations and open items

- **Output only.** DMX input from the widget to Art-Net is not implemented for the serial driver.
- **The VID/PID match is generic.** `0403:6001` is FTDI's default ID, so any FT232-based adapter appears in the picker. Only widgets running the PRO firmware understand this framing. FTDI adapters without a microcontroller (Open DMX-style) use the same ID but will not respond correctly.
- **Fast chases are not resolved.** During a very fast MagicQ chase the fixtures did not visibly track MagicQ's preview. A timing capture during the chase was inconclusive: MagicQ's process reported more than 100% CPU in Activity Monitor while the system stayed responsive. Wi-Fi loss is an unlikely explanation because both programs run on one host. The serial driver already writes one frame per changed Art-Net frame. Not yet done: comparing the converter's `ARTNET-IN` frame count against Wireshark's ArtDmx count for the same chase, to determine whether frames are lost before or after the converter.
- **HID change is untested.** While investigating the chase behaviour, the HID driver was changed to resend only the 32-channel pages that changed instead of all 16 blocking writes per frame. That path was not exercised, because no HID interface was available.

## Changes in the fork

| File | Change |
| --- | --- |
| `src/usbdmx/EnttecProInterface.ts` | new serial driver for the PRO protocol |
| `src/usbdmx/IDMXInterface.ts` | shared driver contract |
| `src/usbdmx/index.ts` | serial detection alongside HID; `protocol` field on detected interfaces |
| `src/ConvertHandler.ts` | driver selection, optional sender, pipeline tracing |
| `src/index.ts`, `src/startupscreen.ts`, `src/controlscreen.ts` | `--debug`, sender gating, mode prompt skipped for serial devices |
| `src/helpers/pipelineLog.ts` | tagged trace and always-on warnings |
| `src/usbdmx/DMXInterface.ts` | HID driver implements the shared contract; changed-page writes |
| `package.json` | `serialport` dependency and `pkg` asset for its native prebuilds |

## Credits

The converter is by [Adrian Baumgart](https://github.com/rainloreley) (MIT). The PRO framing constants and serial settings were checked against the ENTTEC DMX USB PRO API specification and QLC+'s [`enttecdmxusbpro.cpp`](https://github.com/mcallegari/qlcplus/blob/master/plugins/dmxusb/src/enttecdmxusbpro.cpp) (Apache-2.0), used as a reference rather than copied.
