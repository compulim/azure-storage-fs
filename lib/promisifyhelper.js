'use strict';

const { promisify, resolve } = require('bluebird');

function promisifyObject(target, functionNames = Object.keys(target)) {
  return functionNames.reduce((promised, name) => {
    promised[name] = promisify(target[name], { context: target });

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
