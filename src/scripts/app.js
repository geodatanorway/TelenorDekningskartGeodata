var ko = require('knockout');
var $ = require('zepto-browserify').$;
var NProgress = require('nprogress');
var toggler = require('./toggler');
var _ = require('lodash');

var map = require('./map');
var ViewModel = require('./ViewModel');
var matchMedia = require('./libs/match-media');

// removes the ~200ms delay on mobile
var attachFastClick = require('fastclick');
attachFastClick(document.body);

NProgress.start();
map.on('load', () => NProgress.done());

var viewModel = new ViewModel();

$(document).on("click", e => {
  if (!$(e.target).closest("#searchResults").length) {
    viewModel.clearSearchResults();
    viewModel.showPanelIfItWasVisible();
  }
});

toggler('.toggler');

ko.applyBindings(viewModel);

var $searchInput = $('.search-input');
var defaultPlaceholder = $searchInput.attr('placeholder');
function changePlaceholderOnSearchInput () {
  var isMobile = matchMedia('only screen and (max-width: 568px)').matches;
  $searchInput.attr('placeholder', isMobile ? 'Søk' : defaultPlaceholder);
}

changePlaceholderOnSearchInput();
$(window).resize(_.debounce(changePlaceholderOnSearchInput, 200));
