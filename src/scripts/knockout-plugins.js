var ko = require("knockout");

//wrapper for a computed observable that can pause its subscriptions
ko.pauseableComputed = function(evaluatorFunction, evaluatorFunctionTarget) {
    var _cachedValue = "";
    var _isPaused = ko.observable(false);

    //the computed observable that we will return
    var result = ko.computed(function() {
        if (!_isPaused()) {
            //call the actual function that was passed in
            return evaluatorFunction.call(evaluatorFunctionTarget);
        }
        return _cachedValue;
    }, evaluatorFunctionTarget);

    //keep track of our current value and set the pause flag to release our actual subscriptions
    result.pause = function(pauseFor) {
        _cachedValue = this();
        _isPaused(true);
        if (pauseFor) {
            setTimeout(this.resume, pauseFor);
        }
    }.bind(result);

    //clear the cached value and allow our computed observable to be re-evaluated
    result.resume = function() {
        _cachedValue = "";
        _isPaused(false);
    };

    return result;
};