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

  self.createSession = function() {
    return new Promise(function(resolve, reject) {
      self.otHandle.createSession(function(err, session) {
        if (err) {
          reject(err);
        } else {
          resolve(session);
        }
      });
    });
  };

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
        score: 0,
        session: self.createSession()
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

    client.session.then(function(session) {
      client.socket.emit('initOwnSession', JSON.stringify({
        id: session.sessionId,
        apiKey: config.apiKey,
        token: session.generateToken()
      }));
    });

    client.socket.once('disconnect', function() {
      self.clients = self.clients.filter(function(otherClient) {
        return otherClient !== client;
      });

      self.broadcast('userList', JSON.stringify(self.getUserList()));
    });

    client.socket.once('requestStart', function() {
      client.startRequested = true;

      console.log('Trying to start');

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
    var numStartRequests = self.countStartRequests();
    var numClients = self.clients.length;
    console.log('requests:', numStartRequests, 'clients:', numClients);

    return (numStartRequests === numClients);
  };

  self.start = function() {
    console.log('Starting!');

    Promise.all(
      shuffle(getPairs(self.clients).map(shuffle)).map(function(clientPair) {
        return self.runGameBetweenClients(clientPair[0], clientPair[1], 1);
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

      console.log('Tournament Result:', tournamentResult);

      self.broadcast('tournamentResult', JSON.stringify(tournamentResult));
    });
  };

  self.initGameForClients = function(clientA, clientB) {
    console.log('initGameForClients', clientA.username, clientB.username);

    [clientA, clientB].forEach(function(client) {
      var opponent = (client === clientA ? clientB : clientA);

      opponent.session.then(function(opponentSession) {
        var gameInfo = {
          apiKey: config.apiKey,
          sessionId: opponentSession.sessionId,
          token: opponentSession.generateToken(),
          opponentName: opponent.username
        };

        console.log('sending', gameInfo, 'to', client.username);
        client.socket.emit('initGame', JSON.stringify(gameInfo));
      })
    });
  };

  self.closeGameForClients = function(clientA, clientB) {
    [clientA, clientB].forEach(function(client) {
      client.socket.emit('closeGame');
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
    console.log('Queuing game between', clientA.username, 'and', clientB.username);

    if (clientA.disconnected) {
      return clientB;
    }

    if (clientB.disconnected) {
      return clientA;
    }

    var clientAScore = 0;
    var clientBScore = 0;

    return mutex.and([clientA.mutex, clientB.mutex]).lock().then(function(mutexHandle) {
      console.log('Got locks for', clientA.username, 'and', clientB.username);
      self.initGameForClients(clientA, clientB);

      return (function runRound() {
        if (clientAScore + clientBScore === numRounds) {
          self.closeGameForClients(clientA, clientB);

          var winner = (clientAScore >= clientBScore ? clientA : clientB);
          console.log(winner.username, 'won a game');

          mutexHandle.release();

          return winner;
        }

        return self.runRoundBetweenClients(clientA, clientB).then(function(winner) {
          console.log(winner.username, 'won a round');

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
