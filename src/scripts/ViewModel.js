var ko = require('knockout');

class ViewModel {
  constructor(){
    this.searchText = ko.observable("");

    this.searchText.subscribe(newValue => {
      console.log(newValue);
    });
  }
}

module.exports = ViewModel;