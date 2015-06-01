'use strict';

var opentok = require('opentok');

module.exports = function(config) {
  var self = (new (function rockPaperScissors(){}));

  self.clients = [];

  console.log('Initializing opentok with: ' + JSON.stringify(config));
  self.otHandle = opentok(config.apiKey, config.apiSecret);

  self.getUserList = function() {
    return self.clients.map(function(client) { return client.username; });
  };

  self.broadcast = function(evt, data) {
    self.clients.forEach(function(client) {
      client.socket.emit(evt, data);
    });
  };

  self.addSocket = function(sock) {
    sock.emit('userList', JSON.stringify(self.getUserList()));

    sock.once('username', function(username) {
      self.addClient({
        username: username,
        socket: sock
      });
    });
  };

  self.addClient = function(client) {
    self.clients.push(client);
    self.broadcast('userList', JSON.stringify(self.getUserList()));

    self.otHandle.createSession(function(err, session) {
      if (err) {
        throw err;
      }

      console.log('Created session, id: ' + session.sessionId);

      client.socket.emit('startInfo', JSON.stringify({
        apiKey: config.apiKey,
        sessionId: session.sessionId,
        token: session.generateToken()
      }));
    });
  };

  return self;
};
