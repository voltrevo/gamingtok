'use strict';

module.exports = function(prefix) {
  var api = {};

  ['debug', 'info', 'error'].forEach(function(level) {
    api[level] = function() {
      var args = Array.prototype.slice.apply(arguments);
      args.unshift(prefix);

      console[level].apply(console, args);
    };
  });

  return api;
}
