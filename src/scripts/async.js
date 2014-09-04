module.exports = async;

function async (generator) {
  var iterator,
      generatorTakesArgs = generator.length;

  // if the generator takes args we return a function,
  // that when called passes its args to the generator
  if (generatorTakesArgs) {
    return function () {
      iterator = generator.apply(this, arguments);
      return move(iterator, iterator.next());
    };
  }

  // just run the generator immediately
  iterator = generator();
  return move(iterator, iterator.next());

  function move (iterator, result) {
    if (result.done) {
      return result.value;
    }

    return result.value.then(
      function (promiseResult) {
        return move(iterator, iterator.next(promiseResult));
      },
      function (promiseError) {
        return move(iterator, iterator.throw(promiseError));
      });
  }
}

// var P = require('bluebird');
// function wait (delay) {
//   return new P(resolve => {
//     setTimeout(resolve, delay * 1000);
//   });
// }

// async(function * () {
//   yield wait(2);
//   console.log('waited 2');
//   yield wait(1);
//   console.log('waited 1');
// });
