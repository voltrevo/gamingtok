'use strict';

module.exports = function(items) {
  var result = [];

  for (var i = 0; i !== items.length; i++) {
    for (var j = i + 1; j !== items.length; j++) {
      result.push([items[i], items[j]]);
    }
  }

  return result;
};
