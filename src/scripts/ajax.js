var jsonp = require('jsonp');
var P = require('bluebird');

function getJsonp(url) {
  return new P((resolve, reject) => {
    jsonp(url, function(err, data) {
      if (err)
        reject(err);
      else
        resolve(data);
    });
  });
}

exports.jsonp = getJsonp;