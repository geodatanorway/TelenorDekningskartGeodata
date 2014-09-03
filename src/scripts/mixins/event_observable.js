var Rx = require('rx');
var _ = require('lodash');

module.exports = {
  componentWillMount: function() {
    if (!this.subjects) return;

    var eventHandlers = {},
    subjects = {};

    this.subjects.forEach(function(key) {
      var subject = new Rx.Subject();

      eventHandlers[key] = subject.onNext.bind(subject);
      subjects[key] = subject;
    });

    this.handlers = eventHandlers;
    this.subjects = subjects;
  },

  componentDidMount: function() {
    if (!this.subjects) return;

    var streams = this.fireStreams();
  },

  componentWillUnmount: function() {
    if (!this.subjects) return;

    this.subjects.forEach(function(key) {
      this.subjects[key].dispose();
    });
  }
};
