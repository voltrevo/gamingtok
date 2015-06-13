'use strict';

module.exports = function(items) {
  items = items.slice();

  for (var i = 0; i !== items.length; i++) {
    var j = i + Math.floor((items.length - i) * Math.random());

    var tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }

  return items;
};
