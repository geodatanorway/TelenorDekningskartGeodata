var _ = require('lodash');

exports.UserLocation = L.icon({
  iconUrl: '../images/circle-blue.png',
  iconSize: [21, 21],
  className: 'icon-user-location'
});

exports.UserLocationTracking = L.icon({
  iconUrl: '../images/circle-blue.png',
  iconSize: [21, 21],
  className: 'icon-user-location icon-user-location--tracking'
});

exports.PlaceLocation = L.icon({
  iconUrl: '../images/marker-white.png',
  iconSize: [48, 48],
});

exports.WifiLocation = L.icon({
  iconUrl: '../images/wifi-marker-blue.png',
  iconSize: [48, 48],
});
