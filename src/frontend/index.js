'use strict';

var io = require('socket.io-client');

window.addEventListener('load', function() {
  document.body.appendChild(document.createTextNode('Hello world!'));

  var sock = io(window.location.origin);

  sock.emit('msg', 'foobar');
});
