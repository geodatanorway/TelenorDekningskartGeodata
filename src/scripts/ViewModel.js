var ko = require('knockout');
var _ = require('lodash');
var $ = require('zepto-browserify').$;
var NProgress = require('nprogress');

var map = require('./map');
var geodata = require('./geodata');
var async = require('./async');
var ajax = require('./ajax');
require('./knockout-plugins');
require('./jquery-plugins');

class ViewModel {
  constructor() {
    var self = this;
    this.searchText = ko.observable("");
    this.searchTextHasFocus = ko.observable(false);
    this.searchTextThrottled = ko.pauseableComputed(this.searchText).extend({
      rateLimit: {
        timeout: 500,
        method: "notifyWhenChangesStop"
      }
    });
    this.searchResults = ko.observableArray();

    this.shouldShowPanel = ko.observable(true);

    this.canTrackUser = ko.observable(false);
    map.on('location:found', () => this.canTrackUser(true));
    map.on('location:denied', () => this.canTrackUser(false));

    this.trackUser = ko.observable(false);

    this.show2g = ko.observable(false);
    this.show3g = ko.observable(false);
    this.show4g = ko.observable(true);
    this.showOutside = ko.observable(true);
    this.showInside = ko.observable(false);
    this.showWifi = ko.observable(false);

    this.show2g.subscribe(hideWifi);
    this.show3g.subscribe(hideWifi);
    this.show4g.subscribe(hideWifi);

    function hideWifi(newValue) {
      if (newValue)
        self.showWifi(false);
    }

    this.showWifi.subscribe(newValue => {
      if (newValue) {
        this.show2g(false);
        this.show3g(false);
        this.show4g(false);
      }
      map.setWifiVisibility(newValue);
    });

    this.showOutside.subscribe(outside => {
      this.showInside(!outside);
    });
    this.showInside.subscribe(inside => {
      this.showOutside(!inside);
    });

    this.buttonText = ko.pureComputed(() => {
      return "";
    });

    this.filterCss = ko.pureComputed(() => {
      var css = [];

      if (self.shouldShowPanel()) {
        css.push('button--in-panel');
      }
      return css.join(" ");
    });

    this.onSearchClick = () => {
      this.searchTextThrottled.resume();
      this.search();
      this.searchTextHasFocus(true);
    };

    this.searchTextHasFocus.subscribe(hasFocus => this.shouldShowPanel(false));

    this.clearSearchText = (e) => {
      this.searchText("");
      this.searchTextHasFocus(true);
    };

    this.togglePanelVisibility = () => self.shouldShowPanel(!self.shouldShowPanel());

    this.layers = ko.pureComputed(() => {
      var layers = [];
      layers.outside = this.showOutside();
      layers.inside = this.showInside();
      if ((this.showOutside() === false) && (this.showInside() === false) || this.showWifi() === true) {
        return layers;
      }

      if (this.show2g()) {
        layers.push(map.Layers.Out2G);
      }

      if (this.show3g()) {
        layers.push(map.Layers.Out3G);
      }

      if (this.show4g()) {
        layers.push(map.Layers.Out4G);
      }

      return layers;
    });

    this.layers.subscribe(newValue => {
      map.setLayers(newValue);
    });

    map.on("loading", () => NProgress.start());
    map.on("load", () => NProgress.done());
    map.on('tracking:stop', () => self.trackUser(false));

    this.searchTextThrottled.subscribe(newValue => this.search());

    this.search = async(function * () {
      var searchText = this.searchText();
      if (!searchText) {
        return;
      }
      var rows = yield geodata.autoComplete(searchText);
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
      map.setMarker(item.lat, item.lon, "lastSearch", {
        title: item.suggestion
      });
    };

    this.onSuggestionClicked = (item) => {
      this.selectItem(item);
    };

    this.clearSearchResults = (event) => {
      this.searchResults.removeAll();
    };

    this.onListKeyDown = function(vm, event) {
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

    this.onSearchKeyDown = (vm, event) => {
      if (event.which === 27) { // escape
        this.clearSearchResults();
      } else if (event.which === 40 || event.which === 9) { // arrow down or TAB
        $("#searchResults").children().first().focus();
      } else if (event.which === 13) { // enter
        this.selectFirstResult();
      } else {
        this.searchTextThrottled.resume();
      }

      return true;
    };

    $("#searchResults").on("keydown", "li", function(e) {
      self.searchTextHasFocus(false);
      var $li = $(this);
      switch (event.which) {
        case 27: // esc
          self.clearSearchResults();
          self.searchTextHasFocus(true);
          break;
        case 38: // up
          $li.prevWrap().focus();
          break;
        case 40: // down
        case 9: // tab
          if (e.shiftKey) {
            $li.prevWrap().focus();
          } else {
            $li.nextWrap().focus();
          }
          break;
        case 13: // enter
          $li.click();
          self.searchTextHasFocus(true);
          self.clearSearchResults();
          break;
      }
    });

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