var interceptors = [];

XMLHttpRequest.prototype.reallySend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function(body) {
    
    for (var i = 0; i < interceptors.length; i++) {
      if(typeof interceptors[i] === "function"){
        body = interceptors[i](body);
      }
    }

    this.reallySend(body);
};

exports.addInterceptor = (interceptor) => {
  interceptors.push(interceptor);
};