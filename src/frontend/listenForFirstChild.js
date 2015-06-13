'use strict';

module.exports = function(el, timeout) {
  return new Promise(function(resolve, reject) {
    var poller = setInterval(function() {
      if (el.firstChild) {
        clearInterval(poller);
        resolve(el.firstChild);
      }
    });

    // Fail-safe to make sure poller stops
    setTimeout(function() {
      clearInterval(poller);
      reject('timeout');
    }, timeout || 1000);
  });
};
