var ko = require("knockout");
var Rx = require("rx");

ko.subscribable.fn.toRx = function(startWithCurrentValue) {
  /// <summary>Returns an Rx.Observable that signals whenever the underlying ko object changes</summary>
  /// <param name="startWithCurrentValue" type="Boolean">If true, the resulting observable sequence will start with the current value of the ko object at the time of subscription, unless the current value is 'undefined'.</param>
  /// <returns type="Rx.Observable"></returns>
  var source = this;

  return Rx.Observable.createWithDisposable(function(observer) {
    var onNext = observer.onNext.bind(observer),
      subscription = source.subscribe(onNext),
      currentValue;

    if (startWithCurrentValue && ko.isObservable(source)) {
      currentValue = source();

      if (currentValue !== undefined) {
        onNext(currentValue);
      }
    }

    return subscription;
  });
};

Rx.Observable.prototype.toKO = function() {
  /// <summary>Returns a read-only ko.observable which will be subscribed to the source Rx.Observable and will always contain the most recent value received from source</summary>
  /// <returns type="ko.observable"></returns>
  var source = this,
    value = ko.observable(),
    subscription = new Rx.SingleAssignmentDisposable(),
    computed = ko.computed({
      read: function() {
        if (!subscription.disposable()) {
          ko.computed(function() {
            subscription.disposable(source.subscribe(value));
          }).dispose();
        }

        return value();
      },
      deferEvaluation: true
    }),
    dispose = computed.dispose;

  computed.dispose = function() {
    subscription.dispose();
    dispose.apply(this, arguments);
  };

  return computed;
};