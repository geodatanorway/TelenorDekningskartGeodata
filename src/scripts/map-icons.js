var _ = require('lodash');

var AwesomeMarkers = require('./libs/leaflet.awesome-markers');

function icon (options) {
  options = _.extend({ prefix: 'fa' }, options);
  return AwesomeMarkers.icon(options);
}

exports.MyLocation = icon({
  markerColor: 'green',
  icon: 'circle-o'
});

exports.Wifi = icon({
  markerColor: 'blue',
  icon: 'wifi'
});

