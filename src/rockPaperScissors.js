'use strict';

var coreRockPaperScissors = require('./coreRockPaperScissors');

var runRound = null;
var getMove = null;

module.exports = function(numRounds) {
  return function(gameSockets) {
    var players = gameSockets.map(function(gameSocket) {
      var player = {
        socket: gameSocket,
        score: 0,
        disconnected: false
      };

      // TODO: piling on close handlers here
      player.socket.onclose(function() {
        player.disconnected = true;
      });

      return player;
    });

    var totalScore = function() {
      return players.map(function(player) {
        return player.score;
      }).reduce(function(a, b) {
        return a + b;
      })
    };

    var leadingPlayer = function() {
      return players.reduce(function(a, b) {
        return (a.score > b.score ? a : b);
      });
    };

    return (function loop() {
      if (totalScore() === numRounds) {
        return leadingPlayer();
      }

      return runRound(players).then(function(winner) {
        winner.score++;
        return loop();
      });
    }()).catch(function() {
      return leadingPlayer();
    });
  }
};

runRound = function(players) {
  return (function loop() {
    return Promise.all(players.map(function(player) {
      return getMove(player);
    })).then(function(moves) {
      console.log('Got moves:', moves);

      var result = coreRockPaperScissors(moves[0], moves[1]);

      if (result === 'tie') {
        if (players[0].disconnected && players[1].disconnected) {
          return Promise.reject();
        } else {
          return loop();
        }
      } else {
        var winner = (result === 'a' ? players[0] : players[1]);
        console.log('Round winner:', winner);

        return winner;
      }
    });
  })();
};

getMove = function(player) {
  return new Promise(function(resolve) {
    if (player.disconnected) {
      resolve('disconnected');
      return;
    }

    player.socket.route('moveRequest').send().receiveOne(function(move) {
      resolve(move.value);
    });

    // TODO: piling up on close handlers :/
    player.socket.onclose(function() {
      resolve('disconnected');
    });
  });
};
