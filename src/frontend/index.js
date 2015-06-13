'use strict';

var alertify = require('./alertify');
var opentok = require('../shared/moduleCandidates/opentok');
var sockception = require('sockception');
var wsPort = require('../shared/wsPort');
var consoleLogger = require('../shared/moduleCandidates/consoleLogger');
var removeChildren = require('../shared/moduleCandidates/removeChildren');
var listenForFirstChild = require('./listenForFirstChild');
var insistPrompt = require('./insistPrompt');
var runGame = require('./runGame');

require('./style.css');

var streamsSection = require('./streamsSection.html');

var userListSection;

window.addEventListener('load', function() {
  document.title = 'GamingTok';

  var titleSection = document.createElement('div');
  titleSection.setAttribute('class', 'full-width-section title-section');
  titleSection.innerHTML = 'GamingTok';
  document.body.appendChild(titleSection);

  userListSection = document.createElement('div');
  userListSection.setAttribute('class', 'full-width-section user-list');
  document.body.appendChild(userListSection);

  document.body.appendChild(streamsSection());
});

var waitForButton = function(desc) {
  return new Promise(function(resolve) {
    var section = document.createElement('div');
    section.setAttribute('class', 'full-width-section');

    document.body.insertBefore(section, userListSection.nextSibling);

    var submitButton = document.createElement('button');
    submitButton.appendChild(document.createTextNode(desc));
    section.appendChild(submitButton);

    submitButton.addEventListener('click', function() {
      document.body.removeChild(section);
      resolve();
    });
  });
};

opentok.then(function(OT) {
  var wrappedInitPublisher = function(el) {
    return new Promise(function(resolve, reject) {
      var publisher = OT.initPublisher(
        el,
        {insertMode: 'append'},
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(publisher);
          }
        }
      );

      listenForFirstChild(el).then(function(firstChild) {
        firstChild.style.width = '';
        firstChild.style.height = '';
      });
    });
  };

  var baseSock = sockception.connect(
    'ws://' + window.location.hostname + ':' + wsPort + '/',
    consoleLogger('sockception:')
  );

  baseSock.route('connected').receiveOne(function() {
    var sock = baseSock.route('joinRoom').send(window.location.pathname);

    sock.route('userList').receiveMany(function(userList) {
      removeChildren(userListSection);

      userList.value.forEach(function(username) {
        var userDiv = document.createElement('div');
        userDiv.appendChild(document.createTextNode(username));
        userListSection.appendChild(userDiv);
      });
    });

    var publisherPromise = Promise.defer();

    insistPrompt('Your name', '').then(function(username) {
      sock.route('username').send(username);

      document.querySelector('#streams-section').style.display = '';
      publisherPromise.resolve(wrappedInitPublisher(document.querySelector('#your-stream')));

      sock.route('isRunning').send().receiveOne(function(running) {
        if (!running.value) {
          waitForButton('Let\'s Begin').then(function() {
            sock.route('requestStart').send();
          });
        }
      });
    });

    sock.route('initOwnSession').receiveMany(function(ownSessionInfo) {
      console.log('ownSessionInfo', ownSessionInfo.value);

      var ownSession = OT.initSession(ownSessionInfo.value.apiKey, ownSessionInfo.value.id);

      ownSession.connect(ownSessionInfo.value.token, function(error) {
        if (error) {
          console.error('Error connecting: ', error.code, error.message);
          return;
        }

        publisherPromise.promise.then(function(publisher) {
          console.log('Publishing stream.');

          ownSession.publish(publisher, function(err) {
            if (err) {
              throw err;
            }
          });
        });
      });
    });

    sock.route('initGame').receiveMany(function(gameSocket) {
      runGame(gameSocket, OT);
    });

    sock.route('tournamentResult').receiveOne(function(tournamentResult) {
      alertify.alert(JSON.stringify(tournamentResult.value));

      waitForButton('Let\'s Begin').then(function() {
        sock.route('requestStart').send();
      });
    });
  });
});
