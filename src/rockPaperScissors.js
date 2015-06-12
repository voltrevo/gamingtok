'use strict';

var mutex = require('mutex');
var opentok = require('opentok');

var coreRockPaperScissors = require('./coreRockPaperScissors');
var shuffle = require('./shuffle');
var getPairs = require('./getPairs');

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
      var client = {
        username: username,
        mutex: mutex.create(client),
        socket: sock,
        startRequested: false,
        inGame: false,
        disconnected: false,
        score: 0
      };

      sock.once('close', function() {
        client.disconnected = true;
      });

      self.addClient(client);
    });
  };

  self.addClient = function(client) {
    self.clients.push(client);
    self.broadcast('userList', JSON.stringify(self.getUserList()));

    client.socket.once('disconnect', function() {
      self.clients = self.clients.filter(function(otherClient) {
        return otherClient !== client;
      });

      if (self.waitingClient === client) {
        self.waitingClient = null;
      }

      self.broadcast('userList', JSON.stringify(self.getUserList()));
    });

    if (!self.waitingClient) {
      self.waitingClient = client;
      return;
    }

    client.socket.once('requestStart', function() {
      client.startRequested = true;

      if (self.readyToStart()) {
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
    return (self.countStartRequests() === self.clients.length);
  };

  self.start = function() {
    Promise.all(
      shuffle(
        getPairs(self.clients).map(shuffle)
      ).map(function(clientPair) {
        return self.runGameBetweenClients(clientPair[0], clientPair[1], 5);
      })
    ).then(function(winners) {
      winners.forEach(function(winner) {
        winner.score++;
      });

      var tournamentResult = self.clients.slice().sort(function(clientA, clientB) {
        return clientB.score - clientA.score;
      }).map(function(client, i) {
        return {
          username: client.username,
          position: i + 1,
          score: client.score
        };
      });

      self.broadcast('tournamentResult', tournamentResult);
    });
  };

  self.initSessionForClients = function(clientA, clientB) {
    self.otHandle.createSession(function(err, session) {
      if (err) {
        throw err;
      }

      console.log('Created session, id: ' + session.sessionId);

      [clientA, clientB].forEach(function(client) {
        client.inGame = true;
        client.socket.emit('game', JSON.stringify({
          apiKey: config.apiKey,
          sessionId: session.sessionId,
          token: session.generateToken()
        }));
      });
    });
  };

  self.getClientMove = function(client) {
    return new Promise(function(resolve) {
      if (client.disconnected) {
        resolve('disconnected');
        return;
      }

      client.socket.emit('moveRequest');

      client.socket.once('move', function(data) {
        resolve(data.toString());
      });

      client.socket.once('close', function() {
        resolve('disconnected');
      });
    });
  };

  self.runGameBetweenClients = function(clientA, clientB, numRounds) {
    if (clientA.disconnected) {
      return clientB;
    }

    if (clientB.disconnected) {
      return clientA;
    }

    var clientAScore = 0;
    var clientBScore = 0;

    return mutex.or([clientA.mutex, clientB.mutex]).lock().then(function(mutexHandle) {
      self.initSessionForClients(clientA, clientB);

      return (function runRound() {
        if (clientAScore + clientBScore === numRounds) {
          mutexHandle.release();
          return (clientAScore >= clientBScore ? clientA : clientB);
        }

        return self.runRoundBetweenClients(clientA, clientB).then(function(winner) {
          if (winner === clientA) {
            clientAScore++;
          } else {
            clientBScore++;
          }

          return runRound();
        });
      })();
    }).catch(function() {
      return (clientAScore >= clientBScore ? clientA : clientB);
    });
  };

  self.runRoundBetweenClients = function(clientA, clientB) {
    return (function attempt() {
      return Promise.all([clientA, clientB].map(function(client) {
        return self.getClientMove(client);
      })).then(function(moves) {
        var result = coreRockPaperScissors(moves[0], moves[1]);

        if (result === 'tie') {
          if (clientA.disconnected && clientB.disconnected) {
            return Promise.reject();
          } else {
            return attempt();
          }
        } else {
          return (result === 'a' ? clientA : clientB);
        }
      });
    })();
  };

  return self;
};
