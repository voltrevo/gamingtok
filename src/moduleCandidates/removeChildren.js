'use strict';

module.exports = function(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
};
