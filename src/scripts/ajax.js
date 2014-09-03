var jsonp = require('jsonp');
var Promise = require('bluebird');

function getJsonp(url) {
  return new Promise((resolve, reject) => {
    jsonp(url, function(err, data) {
      if (err)
        reject(err);
      else
        resolve(data);
    });
  });
}

exports.jsonp = getJsonp;