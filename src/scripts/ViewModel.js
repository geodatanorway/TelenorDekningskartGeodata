var ko = require('knockout');
var _ = require('lodash');
var $ = require('zepto-browserify').$;
var NProgress = require('nprogress');

var map = require('./map');
var geodata = require('./geodata');
var async = require('./async');
var ajax = require('./ajax');

class ViewModel {
  constructor() {
    var self = this;
    this.searchText = ko.observable("");
    this.searchTextThrottled = ko.pureComputed(this.searchText).extend({
      rateLimit: {
        timeout: 500,
        method: "notifyWhenChangesStop"
      }
    });
    this.searchResults = ko.observableArray();

    this.shouldShowPanel = ko.observable(false);

    this.trackUser = ko.observable(false);

    this.show2g = ko.observable(true);
    this.show3g = ko.observable(true);
    this.show4g = ko.observable(true);
    this.outdoors = ko.observable("true");
    this.mode = ko.observable("Dekning");
    this.mode.subscribe(newValue => {
      switch(newValue){
        case "Dekning":
        map.setWifiVisibility(false);
        map.setLayers(this.layers());
        break;
        case "Wifi":
        map.setWifiVisibility(true);
        map.setLayers([]);
        break;
      }
    });

    this.togglePanelVisibility = function() {
        self.shouldShowPanel(!self.shouldShowPanel());
    };

    this.layers = ko.pureComputed(() => {
      var layers = [];
      if (this.outdoors() === "true") {
        if (this.show2g())
          layers.push(map.Layers.Out2G);
        if (this.show3g())
          layers.push(map.Layers.Out3G);
        if (this.show4g())
          layers.push(map.Layers.Out4G);
      } else {
        if (this.show2g())
          layers.push(map.Layers.In2G);
        if (this.show3g())
          layers.push(map.Layers.In3G);
        if (this.show4g())
          layers.push(map.Layers.In4G);
      }
      return layers;
    });

    this.layers.subscribe(newValue => {
      map.setLayers(newValue);
    });

    this.mapKeys = function() {
        $("#searchResults").children().each(function( index, value ) {
            $(value).keydown(function( event ) {
                if (event.which === 40) {
                    $(value).next().focus();
                }
                if (event.which === 38) {
                    $(value).prev().focus();
                }
                if (event.which === 13) {
                    $(value).click();
                }
            });
        });

        $("#searchResults").children().first().focus();
    };

    map.on("loading", () => NProgress.start());
    map.on("load",    () => NProgress.done());

    this.searchTextThrottled.subscribe(newValue => {
      async(function * () {
        var rows = yield geodata.autoComplete(newValue);
        self.searchResults(rows);
      });
    });

    this.onTrackUserClicked = () => {
      self.trackUser(!self.trackUser());
      map.toggleTrackUser();
    };

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
      if (event.which === 40) {
          self.mapKeys();
      }

      return true;
    };
  }
}

module.exports = ViewModel;
