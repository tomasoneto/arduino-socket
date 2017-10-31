const SerialPort = require('serialport');
const { eachSeries } = require('async');
const { get, find } = require('lodash');
const { Duplex } = require('stream');

class ArduinoStream extends Duplex {

  constructor(options) {
    super(options);
    this.identifier = get(options, 'identifier', /arduino/i);

    this.on('pipe', src => {
      src.on('end', () => this.push(null));
      src.on('close', (err) => this.emit('close', err));
      src.on('error', (err) => this.emit('error', err));
      src.on('open', () => this.emit('open'));
    });
  }

  connect(cb) {
    this.serialport = undefined;

    let interval = setInterval(this._scan, 1000, (err, port) => {
      if (err) return cb(err);

      if (port) {
        clearInterval(interval);
        this.serialport = new SerialPort(port.comName, { baudRate: 9600 });
        this.serialport.pipe(this);
        return cb();
      }
    });

    return interval;
  }

  _scan(cb) {
    SerialPort.list((err, ports) => {
      if (err) return cb(err);

      let port = find(ports, p => p.pnpId && p.pnpId.match(this.identifier));

      return cb(null, port);
    });
  }

  // chunk <Buffer> | <string> | <any> The chunk to be written. Will always be a buffer unless the decodeStrings option was set to false or the stream is operating in object mode.
  // encoding <string> If the chunk is a string, then encoding is the character encoding of that string. If chunk is a Buffer, or if the stream is operating in object mode, encoding may be ignored.
  // callback <Function> Call this function (optionally with an error argument) when processing is complete for the supplied chunk
  _write(chunk, encoding, callback) {
    if (typeof chunk === 'string') chunk = Buffer.from(chunk, encoding);

    if (this.serialport) {
      this.serialport.write(chunk);
      this.serialport.drain(callback);
    }
  }

  // chunks <Array> The chunks to be written. Each chunk has following format: { chunk: ..., encoding: ... }.
  // callback <Function> A callback function (optionally with an error argument) to be invoked when processing is complete for the supplied chunks.
  _writev(chunks, callback) {
    eachSeries(chunks, (item, cb) => { this._write(item.chunk, item.encoding, cb) }, callback);
  }

  // callback <Function> Call this function (optionally with an error argument) when finished writing any remaining data.
  _final(callback) {
    return callback();
  }

  // size <number> Number of bytes to read asynchronously
  _read(size) {
      // Do nothing
  }
}

module.exports = ArduinoStream;
