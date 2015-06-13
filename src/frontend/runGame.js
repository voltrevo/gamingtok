'use strict';

var insistPrompt = require('./insistPrompt');
var listenForFirstChild = require('./listenForFirstChild');

module.exports = function(gameSocket, OT) {
  var gameInfo = gameSocket.value;

  var wrappedSubscribe = function(session, stream, el) {
    return new Promise(function(resolve, reject) {
      session.subscribe(stream, el, {insertMode: 'append'}, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });

      listenForFirstChild(el).then(function(firstChild) {
        firstChild.style.width = '';
        firstChild.style.height = '';
      });
    });
  };

  // TODO: do this better
  document.querySelector('#opponents-stream-name').innerHTML = gameInfo.opponentName;

  var opponentSession = OT.initSession(gameInfo.apiKey, gameInfo.sessionId);

  opponentSession.connect(gameInfo.token, function(error) {
    if (error) {
      console.log('Error connecting: ', error.code, error.message);
      return;
    }

    console.log('Connected to the session.');

    opponentSession.on('streamCreated', function(event) {
      console.log('New stream in the session: ' + event.stream.streamId);

      wrappedSubscribe(
        opponentSession,
        event.stream,
        document.querySelector('#opponents-stream')
      );
    });
  });

  gameSocket.route('moveRequest').receiveMany(function(moveRequest) {
    insistPrompt(
      'rock/paper/scissors',
      ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)]
    ).then(function(move) {
      moveRequest.send(move);
    });
  });

  gameSocket.route('closeGame').receiveOne(function() {
    console.log('Got closeGame');
    opponentSession.disconnect();
  });
};
