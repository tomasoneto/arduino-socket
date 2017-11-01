const http = require('http');
const IO = require('socket.io');
const { get } = require('lodash');

const ArduinoStream = require('./arduino');

class ArduinoServer {

  static create(options) {
    let port = get(options, 'port', 8080);
    let server = http.createServer();
    let io = IO(server);

    io.arduino = new ArduinoStream();
    io.arduino.on('data', data => io.emit('data', data));
    io.arduino.on('open', () => {
      io.arduino.connected = true;
      io.emit('arduino connected');
    });
    io.arduino.on('error', err => io.emit('arduino error', err));
    io.arduino.on('close', err => {
      io.arduino.connected = false;
      io.emit('arduino close', err)
    });

    io.on('connection', socket => {
      if (io.arduino.connected) socket.emit('arduino connected');

      socket.on('data', data => {
        console.log('socket:', data, Buffer.from(data, 'hex'));
        io.arduino.write(Buffer.from(data, 'hex'));
      });
      socket.on('close', err => console.log(err, 'Client closed connection'));
      socket.on('error', err => console.log(err));
      socket.on('disconnect', (err) => console.log('user disconnected', err));
    });

    server.on('listening', () => console.log(`Server listening on ${port}`));

    server.on('error', (err) => {
      if (err.code == 'EADDRINUSE') {
        console.warn('Address in use, retrying...');
        setTimeout(() => {
          server.close();
          server.listen(port);
        }, 1000);
      }
      else {
        console.log(err);
      }
    });

    server.on('close', (err) => console.log('Server closed', err));
    server.listen(port);

    io.arduino.connect(() => {});

    return io;
  }
}

module.exports = ArduinoServer;
