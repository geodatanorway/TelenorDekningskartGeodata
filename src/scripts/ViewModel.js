var ko = require('knockout');
//var Rx = require('rx');
var koRx = require('./knockoutRx');
var async = require('./async');
var ajax = require('./ajax');

class ViewModel {
  constructor() {
    var self = this;
    this.searchUrl = "http://ws.geodataonline.no/search/geodataservice/autocomplete?token=xWZMDJR2KMEMdOpMzf5nqPnepXvI9dKj-tjPzKd_Trr0WtFM-WNdzJLl4ai__oOA&query=";
    this.searchText = ko.observable("");
    this.searchTextThrottled = ko.pureComputed(this.searchText).extend({
      rateLimit: {
        timeout: 500,
        method: "notifyWhenChangesStop"
      }
    });
    
    this.searchTextThrottled.subscribe(newValue => {
      async(function * () {
        var data = yield ajax.jsonp(self.searchUrl + newValue);
        console.log(data);
      });
    });
  }
}

module.exports = ViewModel;