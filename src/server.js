'use strict';

var config = require('./configure');
var wsPort = require('./wsPort');
var nakedjs = require('nakedjs');
var http = require('http');
var sockception = require('sockception');
var roundRobin = require('./roundRobin');
var rockPaperScissors = require('./rockPaperScissors');
var consoleLogger = require('./moduleCandidates/consoleLogger');
var otHandle = require('./otHandle')(config.opentokAuth);

var rooms = {};

http.Server(
  nakedjs(__dirname + '/frontend/index.js')
).listen(config.port);

sockception.listen(
  {port: wsPort},
  consoleLogger('sockception:')
).receiveMany(function(sock) {
  sock.route('connected').send();

  sock.route('joinRoom').receiveMany(function(joinRoom) {
    var room = rooms[joinRoom.value];

    if (!room) {
      room = roundRobin(otHandle, rockPaperScissors(1));
      rooms[joinRoom.value] = room;
      console.log('Room created:', JSON.stringify(joinRoom.value));
    }

    room.addSocket(joinRoom);
  });
});
