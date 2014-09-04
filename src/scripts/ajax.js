var jsonp = require('jsonp');
var P = require('bluebird');
var NProgress = require('NProgress');

function getJsonp(url) {
  return new P((resolve, reject) => {
    NProgress.start();
    jsonp(url, function(err, data) {
      NProgress.done();
      data = data || {};
      var e = (err || data.error);
      if (e)
        reject(e);
      else
        resolve(data);
    });
  });
}

exports.jsonp = getJsonp;
