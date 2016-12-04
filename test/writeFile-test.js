'use strict';

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const fs = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
const fsPromise = fs.promise;
const fetch = require('node-fetch');

describe('writeFile', () => {
  context('when write "TEST" to "writeFile.txt"', () => {
    beforeEach(async () => await fsPromise.writeFile('writeFile.txt', 'TEST'));
    afterEach(async () => await fsPromise.unlink('writeFile.txt'));

    it('should have wrote "TEST" to the file', async () => {
      const now = Date.now();
      const token = fs.sas('writeFile.txt', { expiry: now + 15 * 60000, flag: 'r' });
      const url = `https://${ env.BLOB_ACCOUNT_NAME }.blob.core.windows.net/${ env.BLOB_CONTAINER }/writeFile.txt?${ token }`;
      const res = await fetch(url);

      assert.equal(200, res.status);

      const content = await res.text();

      assert.equal('TEST', content);
    });

    context('when stat-ing the file', () => {
      let stat;

      beforeEach(async () => {
        stat = await fsPromise.stat('writeFile.txt');
      });

      it('should have a file size of 4 bytes', () => {
        assert.equal(4, stat.size);
      });

      it('should not be a directory', () => {
        assert.equal(false, stat.isDirectory());
      });
    });
  });
});
