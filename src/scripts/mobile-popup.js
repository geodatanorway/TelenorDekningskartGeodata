var $ = require('zepto-browserify').$,
    EventEmitter = require('events').EventEmitter;

var CLASS_POPUP = 'mobile-popup';
var CLASS_POPUP_HIDE = 'mobile-popup--hide';
var CLASS_POPUP_CONTENT = 'mobile-popup-content';
var CLASS_POPUP_CLOSE = 'mobile-popup-close';

module.exports = new EventEmitter();
module.exports.show = show;
module.exports.close = close;

var $popup;

function show (content) {
  if (!$popup) {
    initPopup.call(this);
  }

  $popup.removeClass(CLASS_POPUP_HIDE);
  $popup.find('.' + CLASS_POPUP_CONTENT).html(content);
}

function close (e) {
  if (e) {
    e.preventDefault();
  }

  if (!$popup) {
    return;
  }

  $popup.addClass(CLASS_POPUP_HIDE);
  $popup.find('.' + CLASS_POPUP_CONTENT).empty();
}

function initPopup () {
  $popup = $('.' + CLASS_POPUP);
  $popup.find('.' + CLASS_POPUP_CLOSE).on('click', e => {
    close(e);
    this.emit('close');
  });
}
