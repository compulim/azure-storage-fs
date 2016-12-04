'use strict';

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const fs = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
const fsPromise = fs.promise;
const fetch = require('node-fetch');

describe('unlink', () => {
  beforeEach(async () => fsPromise.writeFile('unlink.txt', 'TEST'));

  afterEach(async () => {
    try {
      await fsPromise.unlink('unlink.txt');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  });

  context('when deleting the file', () => {
    beforeEach(async () => await fsPromise.unlink('unlink.txt'));

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