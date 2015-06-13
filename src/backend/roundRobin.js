'use strict';

var mutex = require('mutex');

var shuffle = require('../shared/moduleCandidates/shuffle');
var getPairs = require('../shared/moduleCandidates/getPairs');

module.exports = function(clients, otHandle, game) {
  var broadcast = function(evt, data) {
    clients.forEach(function(client) {
      client.socket.route(evt).send(data);
    });
  };

  var runPair = function(clientA, clientB) {
    console.log('Queuing game between', clientA.username, 'and', clientB.username);

    if (clientA.disconnected) {
      return clientB;
    }

    if (clientB.disconnected) {
      return clientA;
    }

    return mutex.and([clientA.mutex, clientB.mutex]).lock().then(function(mutexHandle) {
      console.log(mutexHandle);
      console.log('Got locks for', clientA.username, 'and', clientB.username);

      return Promise.all([clientA, clientB].map(function(client) {
        var opponent = (client === clientA ? clientB : clientA);

        return opponent.session.then(function(opponentSession) {
          var gameInfo = {
            apiKey: otHandle.apiKey,
            sessionId: opponentSession.sessionId,
            token: opponentSession.generateToken(),
            opponentName: opponent.username
          };

          console.log('sending', gameInfo, 'to', client.username);
          return client.socket.route('initGame').send(gameInfo);
        });
      })).then(function(gameSockets) {
        return game(gameSockets).then(function(winningSocket) {
          gameSockets.forEach(function(gameSocket) {
            gameSocket.route('closeGame').send();
          });

          console.log(mutexHandle);
          console.log(mutexHandle.release);

          mutexHandle.release();

          var winner = (winningSocket === gameSockets[0] ? clientA : clientB);
          console.log(winner.username, 'won a game');

          return winner;
        });
      });
    });
  };

  console.log('Starting!');

  return Promise.all(
    shuffle(getPairs(clients).map(shuffle)).map(function(clientPair) {
      return runPair(clientPair[0], clientPair[1]);
    })
  ).then(function(winners) {
    winners.forEach(function(winner) {
      winner.score++;
    });

    var tournamentResult = clients.slice().sort(function(clientA, clientB) {
      return clientB.score - clientA.score;
    }).map(function(client, i) {
      return {
        username: client.username,
        position: i + 1,
        score: client.score
      };
    });

    console.log('Tournament Result:', tournamentResult);

    broadcast('tournamentResult', tournamentResult);
  });
};
