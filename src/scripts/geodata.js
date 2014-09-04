var NProgress = require('NProgress');

var ajax = require('./ajax');
var async = require('./async');

var SearchUrl = "http://ws.geodataonline.no/search/geodataservice/autocomplete?token=xWZMDJR2KMEMdOpMzf5nqPnepXvI9dKj-tjPzKd_Trr0WtFM-WNdzJLl4ai__oOA&query=";

    var GeometryUrl = "http://services2.geodataonline.no/arcgis/rest/services/Utilities/Geometry/GeometryServer/project";
exports.autoComplete = (query) => {
  return async(function * () {
    NProgress.start();
    var results = yield ajax.jsonp(SearchUrl + query);
    NProgress.done();

    var coords = results.data;
    var suggestions = results.suggestions;
    var types = results.type;
    var joinedPoints = encodeURIComponent(coords.join(",\n"));

    NProgress.start();
    var pointResults = yield ajax.jsonp(GeometryUrl + "?inSR=32633&outSR=4326&geometries=" + joinedPoints + "&f=pjson");
    NProgress.done();

    var geometries = pointResults.geometries;

    var rows = [];
    for (var i = 0; i < coords.length; i++) {
      var {
        x: lon,
        y: lat
      } = geometries[i];
      var suggestion = suggestions[i];
      var type = types[i];
      var row = {
        lat, lon, suggestion, type
      }; // jshint ignore:line
      rows.push(row);
    }
    return rows;
  });
};
