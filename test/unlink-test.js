'use strict';

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const fs = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
const fsPromise = fs.promise;
const fetch = require('node-fetch');
const retry = require('promise-retry');
const { ensure, ensureNot, ensureUnlinkIfExist } = require('./utils');

describe('unlink', () => {
  beforeEach(async () => {
    await fsPromise.writeFile('unlink.txt', 'TEST');
    await ensure(fsPromise, 'unlink.txt');
  });

  afterEach(async () => await ensureUnlinkIfExist(fsPromise, 'unlink.txt'));

  context('when deleting the file', () => {
    beforeEach(async () => {
      await fsPromise.unlink('unlink.txt');
      await ensureNot(fsPromise, 'unlink.txt');
    });

    it('should have deleted the file', async () => {
      try {
        await fsPromise.stat('unlink.txt');
        throw new Error();
      } catch (err) {
        assert.equal('ENOENT', err.code);
      }
    });

    it('should return 404 on GET', async () => {
      const now = Date.now();
      const token = fs.sas('unlink.txt', { expiry: now + 15 * 60000 });
      const url = `https://${ env.BLOB_ACCOUNT_NAME }.blob.core.windows.net/${ env.BLOB_CONTAINER }/unlink.txt?${ token }`;
      const res = await fetch(url);

      assert.equal(404, res.status);
    });
  });
});