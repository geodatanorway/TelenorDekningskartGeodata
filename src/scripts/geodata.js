var ajax = require('./ajax');
var async = require('./async');

var SearchUrl = "http://ws.geodataonline.no/search/geodataservice/autocomplete?token=TDWIG-g6DAtt3qecC_CQnVJ6YOgYdEPvDz8AmK-FaJvINCb-IMpgn0rRLTCTe7ty&query=";
var GeometryUrl = "http://services2.geodataonline.no/arcgis/rest/services/Utilities/Geometry/GeometryServer/project";

exports.autoComplete = async(function * (query) {
  var results = yield ajax.jsonp(SearchUrl + query);

  var coords = results.data || [];
  var suggestions = results.suggestions;
  var types = results.type;
  var joinedPoints = encodeURIComponent(coords.join(",\n"));

  var pointResults = yield ajax.jsonp(GeometryUrl + "?inSR=32633&outSR=4326&geometries=" + joinedPoints + "&f=pjson");

  var geometries = pointResults.geometries;

  var rows = [];
  for (var i = 0; i < coords.length; i++) {
    var {
      x: lon,
      y: lat
    } = geometries[i];
    var suggestion = suggestions[i];
    var type = types[i];
    var row = { lat, lon, suggestion, type }; // jshint ignore:line
    rows.push(row);
  }
  return rows;
});
