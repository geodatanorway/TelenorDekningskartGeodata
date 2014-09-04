var jsonp = require('jsonp');
var P = require('bluebird');

function getJsonp(url) {
  return new P((resolve, reject) => {
    jsonp(url, function(err, data) {
      var e = (err || data.error);
      if (e)
        reject(e);
      else
        resolve(data);
    });
  });
}

exports.jsonp = getJsonp;