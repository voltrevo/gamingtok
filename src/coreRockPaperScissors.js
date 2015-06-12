'use strict';

var checkValid = function(move) {
  return (typeof move === 'string' && ['rock', 'paper', 'scissors'].indexOf(move) !== -1);
};

module.exports = function(moveA, moveB) {
  var moveAValid = checkValid(moveA);
  var moveBValid = checkValid(moveB);

  if (!moveAValid || !moveBValid) {
    return (
      !moveAValid && !moveBValid ? 'tie' :
      moveAValid ?                 'a' :
                                   'b'
    );
  }

  if (moveA === moveB) {
    return 'tie';
  }

  return {
    'rock': 'scissors',
    'paper': 'rock',
    'scissors': 'paper'
  }[moveA] === moveB ? 'a' : 'b';
};
