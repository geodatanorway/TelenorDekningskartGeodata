var ko = require('knockout');
var async = require('./async');
var ajax = require('./ajax');
var _ = require('lodash');
var map = require('./map');

class ViewModel {
  constructor() {
    var self = this;
    this.searchUrl = "http://ws.geodataonline.no/search/geodataservice/autocomplete?token=xWZMDJR2KMEMdOpMzf5nqPnepXvI9dKj-tjPzKd_Trr0WtFM-WNdzJLl4ai__oOA&query=";
    this.geometryUrl = "http://services2.geodataonline.no/arcgis/rest/services/Utilities/Geometry/GeometryServer/project";
    this.searchText = ko.observable("");
    this.searchTextThrottled = ko.pureComputed(this.searchText).extend({
      rateLimit: {
        timeout: 500,
        method: "notifyWhenChangesStop"
      }
    });
    this.searchResults = ko.observableArray();

    this.show2g = ko.observable(true);
    this.show3g = ko.observable(true);
    this.show4g = ko.observable(true);

    this.isLoading = ko.observable();

    map.on("loading", () => {
      this.isLoading(true);
    });

    map.on("load", () => {
      this.isLoading(false);
    });

    this.show2g.subscribe(newValue => {
      map.setLayerVisible(map.Mobile2G, newValue);
    });
    this.show3g.subscribe(newValue => {
      map.setLayerVisible(map.Mobile3G, newValue);
    });
    this.show4g.subscribe(newValue => {
      map.setLayerVisible(map.Mobile4G, newValue);
    });

    this.onSuggestionClicked = (item) => {
      map.centerAt(item.lat, item.lon);
      this.clearSearchResults();
    };

    this.clearSearchResults = (event) => {
      this.searchResults.removeAll();
    };

    this.onKeyPressed = (vm, event) => {
      if (event.which === 27) { // escape
        this.clearSearchResults();
      }
      return true;
    };

    this.searchTextThrottled.subscribe(newValue => {
      async(function * () {
        try {
          var results = yield ajax.jsonp(self.searchUrl + newValue);
          var coords = results.data;
          var suggestions = results.suggestions;
          var types = results.type;
          var joinedPoints = encodeURIComponent(coords.join(",\n"));
          var pointResults = yield ajax.jsonp(self.geometryUrl + "?inSR=32633&outSR=4326&geometries=" + joinedPoints + "&f=pjson");
          var geometries = pointResults.geometries;

          var rows = [];
          for (var i = 0; i < coords.length; i++) {
            var { x: lon, y: lat } = geometries[i];
            var suggestion = suggestions[i];
            var type = types[i];
            var row = { lat, lon, suggestion, type }; // jshint ignore:line
            rows.push(row);
          }
          self.searchResults(rows);
        } catch (err) {
          console.dir(err);
        }
      });
    });
  }
}

module.exports = ViewModel;
