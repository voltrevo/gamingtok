'use strict';

var mutex = require('mutex');
var roundRobin = require('./roundRobin');

module.exports = function(otHandle, game) {
  var self = (new (function room(){}));

  self.game = game;
  self.running = false;

  self.clients = [];

  self.otHandle = otHandle;

  self.getUserList = function() {
    return self.clients.map(function(client) { return client.username; });
  };

  self.broadcast = function(evt, data) {
    self.clients.forEach(function(client) {
      client.socket.route(evt).send(data);
    });
  };

  self.addSocket = function(sock) {
    sock.route('userList').send(self.getUserList());

    sock.route('username').receiveOne(function(username) {
      var client = {
        username: username.value,
        socket: sock,
        mutex: mutex.create(client),
        startRequested: false,
        disconnected: false,
        session: self.otHandle.createSession(),
        score: 0
      };

      sock.onclose(function() {
        client.disconnected = true;
      });

      self.addClient(client);
    });
  };

  self.addClient = function(client) {
    self.clients.push(client);
    self.broadcast('userList', self.getUserList());

    client.session.then(function(session) {
      client.socket.route('initOwnSession').send({
        id: session.sessionId,
        apiKey: self.otHandle.apiKey,
        token: session.generateToken()
      });
    });

    client.socket.onclose(function() {
      self.clients = self.clients.filter(function(otherClient) {
        return otherClient !== client;
      });

      self.broadcast('userList', self.getUserList());
    });

    client.socket.route('isRunning').receiveMany(function(isRunning) {
      isRunning.send(self.running);
    });

    client.socket.route('requestStart').receiveMany(function() {
      client.startRequested = true;

      console.log('Trying to start');

      if (!self.running && self.readyToStart()) {
        self.start();
      }
    });
  };

  self.countStartRequests = function() {
    return self.clients.map(function(client) {
      return client.startRequested ? 1 : 0;
    }).reduce(function(a, b) {
      return a + b;
    });
  };

  self.readyToStart = function() {
    var numStartRequests = self.countStartRequests();
    var numClients = self.clients.length;
    console.log('requests:', numStartRequests, 'clients:', numClients);

    return (numStartRequests === numClients);
  };

  self.start = function() {
    self.running = true;
    roundRobin(self.clients, self.otHandle, self.game).then(self.restart);
  };

  self.restart = function() {
    self.running = false;
    self.clients.forEach(function(client) {
      client.startRequested = false;
      client.score = 0;
    });
  };

  return self;
};
