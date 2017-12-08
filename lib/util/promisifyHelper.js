'use strict';

function promisify(fn, context) {
  return function () {
    const args = [].slice.call(arguments);

    return new Promise((resolve, reject) => {
      fn.apply(context, args.concat((err, result) => {
        err ? reject(err) : resolve(result);
      }));
    });
  };
}

function promisifyObject(target, functionNames = Object.keys(target)) {
  return functionNames.reduce((promised, name) => {
    promised[name] = promisify(target[name], target);

    return promised;
  }, {});
};

function toCallback(promiseFn, options = {}) {
  return function () {
    const args = [].slice.call(arguments);
    const callback = args.pop();

    promiseFn.apply(options.context, args)
      .then(
        result => callback(null, result),
        err => callback(err)
      );
  };
}

module.exports = {
  promisifyObject,
  toCallback
};
