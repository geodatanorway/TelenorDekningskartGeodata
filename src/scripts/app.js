var map = require('./map');
var ko = require('knockout');
var ViewModel = require('./ViewModel');
var $ = require('zepto-browserify').$;

var viewModel = new ViewModel();


$(document).on("click", e => {
  if (!$(e.target).closest("#searchResults").length) {
    viewModel.clearSearchResults();
  }
});


ko.applyBindings(viewModel);



//var searchBar = require('./search');
// console.log(map);
// console.log(searchBar);