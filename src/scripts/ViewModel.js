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
        timeout: 300,
        method: "notifyWhenChangesStop"
      }
    });
    this.searchResults = ko.observableArray();

    this.showPanel = ko.observable(true);

    this.canTrackUser = ko.observable(false);
    this.trackUser = ko.observable(false);

    this.show2g = ko.observable(false);
    this.show3g = ko.observable(false);
    this.show4g = ko.observable(true);
    this.showOutside = ko.observable(true); // dekning
    this.showInside = ko.observable(false); // meget god dekning
    this.showWifi = ko.observable(false);

    this.show2g.subscribe(hideWifi);
    this.show3g.subscribe(hideWifi);
    this.show4g.subscribe(hideWifi);

    map.on('location:found', () => this.canTrackUser(true));
    map.on('location:denied', () => this.canTrackUser(false));

    map.on("loading", () => NProgress.start());
    map.on("load", () => NProgress.done());
    map.on('tracking:stop', () => self.trackUser(false));

    function hideWifi (newValue) {
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

    this.showOutside.subscribe(outside => this.showInside(!outside));
    this.showInside.subscribe(inside => this.showOutside(!inside));

    this.buttonText = ko.pureComputed(() => "");

    this.filterCss = ko.pureComputed(() => {
      var css = [];

      if (self.showPanel()) {
        css.push('button--in-panel');
      }
      return css.join(" ");
    });

    this.onSearchClick = (vm, e) => {
      e.stopPropagation();
      if (!this.searchText()) {
        return;
      }
      this.searchTextThrottled.resume();
      this.search({ forceSearch: true });
      this.searchTextHasFocus(true);
    };

    var panelWasVisibleWhenSearchGotFocus = false;
    this.showPanelIfItWasVisible = function () {
      if (panelWasVisibleWhenSearchGotFocus) {
        panelWasVisibleWhenSearchGotFocus = false;
        self.showPanel(true);
      }
    };
    this.hidePanelRememberVisiblity = function () {
      if (self.showPanel()) {
        panelWasVisibleWhenSearchGotFocus = true;
        self.showPanel(false);
      }
    };

    this.searchTextHasFocus.subscribe(hasFocus => {
      if (hasFocus) {
        self.hidePanelRememberVisiblity();
      }
    });

    this.clearSearchText = (e) => {
      this.searchText("");
      this.searchTextHasFocus(true);
      this.clearSearchResults();
      delete this.previousSearch;
    };

    this.togglePanelVisibility = () => self.showPanel(!self.showPanel());

    this.layers = ko.pureComputed(() => {
      var layers = [];
      layers.outside = this.showOutside();
      layers.inside = this.showInside();
      if ((this.showOutside() === false) && (this.showInside() === false) || this.showWifi() === true) {
        return layers;
      }

      if (this.show2g()) {
        layers.push(map.Layers.MegetGod2G);
      }

      if (this.show3g()) {
        layers.push(map.Layers.MegetGod3G);
      }

      if (this.show4g()) {
        layers.push(map.Layers.MegetGod4G);
      }

      return layers;
    });

    this.layers.subscribe(newValue => map.setLayers(newValue));

    this.searchTextThrottled.subscribe(newValue => this.search());

    this.search = async(function * (options) {
      options = _.extend({
        selectFirstWhenAvailable: false,
        forceSearch: false
      }, options);

      var searchText = this.searchText();
      if (!options.forceSearch) {
        if (!searchText || searchText === self.previousSearch) {
          return;
        }
      }
      self.previousSearch = searchText;

      var rows = yield geodata.autoComplete(searchText);

      if (rows.length > 0) {
        if (options.selectFirstWhenAvailable) {
          self.selectItem(rows[0]);
        } else {
          // Always show search results if we force a search (on clicking the search input).
          // Don't show the results if what's first in the incoming rows is what is already searched for.
          if (!options.forceSearch && searchText === rows[0].suggestion) {
            self.clearSearchResults();
          }
          else {
            self.searchResults(rows);
          }
        }
      }
    });

    this.selectFirstResult = () => {
      if (this.searchText() !== this.previousSearch) {
        this.search({ selectFirstWhenAvailable: true });
      }
      else if (this.searchResults().length > 0) {
        this.selectItem(this.searchResults()[0]);
      }
    };

    this.selectItem = (item) => {
      this.searchTextThrottled.pause();
      this.searchText(item.suggestion);
      this.clearSearchResults();
      map.centerAt(item.lat, item.lon);
      setTimeout(() => map.showGeocodePopup(new L.LatLng(item.lat, item.lon)), 1000);
      setTimeout(() => self.showPanelIfItWasVisible(), 0);
    };

    this.onSuggestionClicked = item => this.selectItem(item);

    this.clearSearchResults = event =>  this.searchResults.removeAll();

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

    this.onListKeyDown = function(vm, event) {
      if (event.which === 8) { // backspace
        self.searchTextHasFocus(true);
      }
    };

    this.onSearchKeyDown = (vm, event) => {
      if (event.which === 27) { // escape
        this.clearSearchResults();
      } else if (event.which === 40 || event.which === 9) { // arrow down or TAB
        var hasResults = (self.searchResults().length > 0);
        var hasSearchText = (this.searchText().length > 0);
        if (hasResults) {
          $("#searchResults").children().first().focus();
        }
        else if (hasSearchText) {
          this.search({ forceSearch: true });
        }
      } else if (event.which === 13) { // enter
        this.selectFirstResult();
      } else {
        this.searchTextThrottled.resume();
      }
      this.hidePanelRememberVisiblity();

      return true;
    };

    $("#searchResults").on("keydown", "li", function (e) {
      self.searchTextHasFocus(false);
      var $li = $(this);
      switch (e.which) {
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
