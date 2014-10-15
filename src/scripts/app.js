var ko = require('knockout');
var $ = require('zepto-browserify').$;
var NProgress = require('nprogress');
var toggler = require('./toggler');

var map = require('./map');
var ViewModel = require('./ViewModel');

// removes the ~200ms delay on mobile
var attachFastClick = require('fastclick');
attachFastClick(document.body);

NProgress.start();
map.on('load', () => NProgress.done());

var viewModel = new ViewModel();

$(document).on("click", e => {
  if (!$(e.target).closest("#searchResults").length) {
    viewModel.clearSearchResults();
  }
});

toggler('.toggler');

ko.applyBindings(viewModel);
