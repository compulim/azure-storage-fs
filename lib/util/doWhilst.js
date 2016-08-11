'use strict';

function doWhilst(iteratee, test) {
  return new Promise((resolve, reject) => {
    const loop = () => {
      Promise.resolve(iteratee())
        .then(() => test())
        .then(result => {
          if (result) {
            process.nextTick(loop);
          } else {
            resolve();
          }
        })
        .catch(reject);
    };

    loop();
  });
};

module.exports = doWhilst;
