'use strict';

const retry = require('promise-retry');

const RETRY_OPTIONS = {
  minTimeout: 100
};

class TestHelper {
  constructor(fsPromise) {
    this.fsPromise = fsPromise;
  }

  async ensureWriteFile(blob, content, options) {
    await this.fsPromise.writeFile(blob, content, options);
    await this.ensureExists(blob);
  }

  async ensureExists(blob) {
    await retry(retry => this.fsPromise.stat(blob).catch(retry), RETRY_OPTIONS);
  }

  async ensureNotExists(blob) {
    await retry(retry => this.fsPromise.stat(blob).then(
      () => retry(new Error('file still exists')),
      err => err.code === 'ENOENT' || retry(err)
    ), RETRY_OPTIONS);
  }

  async ensureRmdirIfExists(blob) {
    try {
      await this.fsPromise.rmdir(blob);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return;
      } else {
        return Promise.reject(err);
      }
    }

    await this.ensureNotExists(blob + '/$$$.$$$');
  }

  async ensureUnlinkIfExists(blob) {
    try {
      await this.fsPromise.unlink(blob);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return;
      } else {
        return Promise.reject(err);
      }
    }

    await this.ensureNotExists(blob);
  }

  async ensureStat(blob, predicate) {
    await retry(async retry => {
      try {
        const stat = await this.fsPromise.stat(blob, { metadata: true, snapshot: true });

        if (!predicate(stat)) {
          retry(new Error('predicate not met'));
        }
      } catch (err) {
        retry(err);
      }
    }, RETRY_OPTIONS);
  }
}

module.exports = function (fsPromise) {
  return new TestHelper(fsPromise);
};
