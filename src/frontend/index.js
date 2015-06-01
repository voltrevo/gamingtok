'use strict';

var io = require('socket.io-client');

window.addEventListener('load', function() {
  var sock = io(window.location.origin);

  sock.on('sessionId', function(data) {
    var sessionId = JSON.parse(data);
    document.body.appendChild(document.createTextNode('Got sessionId: ' + sessionId));
  });
});
