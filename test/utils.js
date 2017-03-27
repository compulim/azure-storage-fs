'use strict';

const retry = require('promise-retry');

async function ensure(fsPromise, blob) {
  await retry(retry => {
    return fsPromise.stat(blob).catch(retry);
  });
}

async function ensureNot(fsPromise, blob) {
  await retry(retry => {
    return fsPromise.stat(blob).then(retry).catch(err => err.code === 'ENOENT' || err);
  });
}

async function unlinkIfExist(fsPromise, blob) {
  try {
    await fsPromise.unlink(blob);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      return Promise.reject(err);
    }
  }
}

module.exports = {
  ensure,
  ensureNot,
  unlinkIfExist
};
