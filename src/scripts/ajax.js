var jsonp = require('jsonp');
var P = require('bluebird');

function getJsonp(url) {
  return new P((resolve, reject) => {
    jsonp(url, function(err, data) {
      var e;
      if (e = (err || data.error))
        reject(e);
      else
        resolve(data);
    });
  });
}

exports.jsonp = getJsonp;