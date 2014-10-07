var _ = require('lodash');

var UserLocationSize = 36 / 2,
    MarkerSize = 98 / 2;

exports.UserLocation = L.icon({
  iconUrl: '../images/circle-blue.png',
  iconSize: [UserLocationSize, UserLocationSize],
  className: 'icon-user-location'
});

exports.UserLocationTracking = L.icon({
  iconUrl: '../images/circle-blue.png',
  iconSize: [UserLocationSize, UserLocationSize],
  className: 'icon-user-location icon-user-location--tracking'
});

exports.PlaceLocation = L.icon({
  iconUrl: '../images/marker-white.png',
  iconSize: [MarkerSize, MarkerSize],
});

exports.WifiLocation = L.icon({
  iconUrl: '../images/wifi-marker-blue.png',
  iconSize: [MarkerSize, MarkerSize],
});
