var _ = require('lodash');

_.mixin({
  checkNested: function(/* obj, level1, level2, ... levelN*/ ) {
    var args = Array.prototype.slice.call(arguments),
      obj = args.shift();

    for (var i = 0; i < args.length; i++) {
      if (!obj || !obj.hasOwnProperty(args[i])) {
        return false;
      }
      obj = obj[args[i]];
    }
    return true;
  }
});