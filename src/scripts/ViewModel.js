var ko = require('knockout');
//var Rx = require('rx');
var koRx = require('./knockoutRx');
var jsonp = require('jsonp');

class ViewModel {
  constructor(){
    this.searchUrl = "http://ws.geodataonline.no/search/geodataservice/autocomplete?token=xWZMDJR2KMEMdOpMzf5nqPnepXvI9dKj-tjPzKd_Trr0WtFM-WNdzJLl4ai__oOA&query=";
    this.searchText = ko.observable("");
    this.searchTextThrottled = ko.pureComputed(this.searchText)
      .extend({rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}});

    this.searchTextThrottled.subscribe(newValue => {
      jsonp(this.searchUrl + newValue, {

      }, function(result){
        console.log(result);
      });
    });
  }
}

module.exports = ViewModel;