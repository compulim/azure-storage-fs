'use strict';

function whilst(test, iteratee) {
  return new Promise((resolve, reject) => {
    const loop = () => {
      return Promise.resolve(test())
        .then(result => {
          if (result) {
            return Promise.resolve(iteratee())
              .then(() => process.nextTick(loop), reject);
          } else {
            return resolve();
          }
        })
        .catch(reject);
    };

    loop();
  });
};

module.exports = whilst;
