var $ = require('zepto-browserify').$;


module.exports = function (selector) {
  $(document).on('click', selector, function (e) {
    e.preventDefault();
    var el = $(e.currentTarget);
    el.hide();
    el.next(selector + "-content").show();
  });
};
