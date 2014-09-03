var ko = require('knockout');
var Rx = require('rx');
//var koRx = require('./knockoutRx');

class ViewModel {
  constructor(){
    this.searchText = ko.observable("");

    //var obs = this.searchText.toRx(true);

    // obs
    //   .throttle(500)
    //   .log();
  }
}

module.exports = ViewModel;