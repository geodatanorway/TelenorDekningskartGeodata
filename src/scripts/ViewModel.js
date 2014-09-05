var ko = require('knockout');
var _ = require('lodash');
var $ = require('zepto-browserify').$;
var NProgress = require('nprogress');

var map = require('./map');
var geodata = require('./geodata');
var async = require('./async');
var ajax = require('./ajax');
require('./knockout-plugins');

class ViewModel {
  constructor() {
    var self = this;
    this.searchText = ko.observable("");
    this.searchTextHasFocus = ko.observable(true);
    this.searchTextThrottled = ko.pauseableComputed(this.searchText).extend({
      rateLimit: {
        timeout: 500,
        method: "notifyWhenChangesStop"
      }
    });
    this.searchResults = ko.observableArray();
    this.searchTextHasFocus.subscribe(newValue => {
      if (newValue === true) {
        this.searchTextThrottled.resume();
        this.search();
      }
    });

    this.shouldShowPanel = ko.observable(false);

    this.canTrackUser = ko.observable(false);
    map.on('location:found', () => this.canTrackUser(true));
    map.on('location:denied', () => this.canTrackUser(false));

    this.trackUser = ko.observable(false);

    this.show2g = ko.observable(true);
    this.show3g = ko.observable(true);
    this.show4g = ko.observable(true);
    this.outdoors = ko.observable("true");
    this.mode = ko.observable("Dekning");
    this.mode.subscribe(newValue => {
      switch (newValue) {
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
      self.searchTextHasFocus(false);
      $("#searchResults").children().each(function(index, value) {
        $(value).keydown(function(event) {
          switch (event.which) {
            case 27: // esc
              self.clearSearchResults();
              self.searchTextHasFocus(true);
              break;
            case 38: // up
              $(value).prev().focus();
              break;
            case 40: // down
            case 9: // tab
              $(value).next().focus();
              break;
            case 13: // enter
              $(value).click();
              self.searchTextHasFocus(true);
              self.clearSearchResults();
              break;
          }
        });
      });

      $("#searchResults").children().first().focus();
    };

    map.on("loading", () => NProgress.start());
    map.on("load", () => NProgress.done());
    map.on('tracking:stop', () => self.trackUser(false));

    this.searchTextThrottled.subscribe(newValue => {
      this.search();
    });

    this.search = async(function * () {
      var rows = yield geodata.autoComplete(this.searchText());
      if (rows.length > 0 && self.selectFirstWhenAvailable) {
        self.selectItem(rows[0]);
        self.selectFirstWhenAvailable = false;
      } else {
        self.searchResults(rows);
      }
    });

    this.onTrackUserClicked = () => {
      var track = !self.trackUser();
      if (track) {
        self.trackUser(true);
        map.trackUser();
      } else {
        self.trackUser(false);
        map.stopTrackUser();
      }
    };

    this.selectItem = (item) => {
      this.searchTextThrottled.pause();
      this.searchText(item.suggestion);
      map.centerAt(item.lat, item.lon);
      this.clearSearchResults();
      map.setMarker(item.lat, item.lon, "lastSearch");
    }

    this.onSuggestionClicked = (item) => {
      this.selectItem(item);
    };


    this.clearSearchResults = (event) => {
      this.searchResults.removeAll();
    };

    this.onKeyDown = function(vm, event) {
      if (event.which === 8) { // backspace
        self.searchTextHasFocus(true);
      }
    };

    this.selectFirstResult = () => {
      if (this.searchResults().length > 0)
        this.selectItem(this.searchResults()[0]);
      else
        this.selectFirstWhenAvailable = true;
    };

    this.onKeyPressed = (vm, event) => {
      if (event.which === 27) { // escape
        this.clearSearchResults();
      } else if (event.which === 40 ||  event.which === 9) { // arrow down or tab
        this.mapKeys();
      } else if (event.which === 13) { // enter
        this.selectFirstResult();
      } else {
        this.searchTextThrottled.resume();
      }

      return true;
    };

    this.onDocumentKeyDown = (vm, e) => {
      var isCtrlOrAlt = (e.ctrlKey || e.altKey || e.metaKey);
      if (isCtrlOrAlt) {
        return true;
      }

      if (self.searchTextHasFocus()) {
        return true;
      }

      var key = e.which;
      var isBetweenAtoZ = (key >= 65 && key <= 90);
      var isNorwegianExtraChars = (key === 222) || (key === 186) || (key === 222); // æøå
      var isBackSpace = (key === 8);

      if (isBetweenAtoZ || isNorwegianExtraChars) {
        self.searchTextHasFocus(true);
        var lowercase = !e.shiftKey;
        var character = String.fromCharCode(e.which);
        if (lowercase) {
          character = character.toLowerCase();
        }
        self.searchText(self.searchText() + character);
      } else if (isBackSpace) {
        self.searchTextHasFocus(true);
        var searchTextMinusLastChar = (self.searchText().substr(0, self.searchText().length - 1));
        self.searchText(searchTextMinusLastChar);
      }
    };
  }
}

module.exports = ViewModel;