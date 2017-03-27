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

async function ensureRmdirIfExist(fsPromise, blob) {
  await rmdirIfExist(fsPromise, blob);
  await ensureNot(fsPromise, blob + '/$$$.$$$');
}

async function ensureUnlinkIfExist(fsPromise, blob) {
  await unlinkIfExist(fsPromise, blob);
  await ensureNot(fsPromise, blob);
}

async function rmdirIfExist(fsPromise, blob) {
  try {
    await fsPromise.rmdir(blob);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      return Promise.reject(err);
    }
  }
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

async function ensureStat(fsPromise, blob, predicate) {
  await retry(async retry => {
    try {
      const stat = await fsPromise.stat(blob, { metadata: true, snapshot: true });

      if (!predicate(stat)) {
        throw new Error('criteria not met');
      }
    } catch (err) {
      retry(err);
    }
  });
}

module.exports = {
  ensure,
  ensureNot,
  ensureRmdirIfExist,
  ensureStat,
  ensureUnlinkIfExist,
  rmdirIfExist,
  unlinkIfExist
};
