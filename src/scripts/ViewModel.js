var ko = require('knockout');
var Rx = require('rx');
var koRx = require('./knockoutRx');

class ViewModel {
  constructor(){
    this.searchText = ko.observable("");

    this.searchText.subscribe(newValue => {
      console.log(newValue);
    });
  }
}

module.exports = ViewModel;