var $ = require('zepto-browserify').$;

/**
 * Toggler
 * - listens for click on selector + "-show"
 * - hides the clicked element
 * - finds outer element with selector
 * - searches down for selector + "-content" and shows it
 */
module.exports = function (selector) {
  $(document).on('click', selector + '-show', function (e) {
    e.preventDefault();

    var el = $(e.currentTarget);
    el.hide();

    var parentElement = el.closest(selector);
    if (!parentElement) {
      console.error("Could not find parent toggler element with class ",  selector);
      return;
    }

    var content = parentElement.find(selector + "-content");
    if (!content) {
      console.error("Could not find child toggler-content element with class",  selector);
      return;
    }

    content.show();
  });
};
