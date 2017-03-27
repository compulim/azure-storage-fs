'use strict';

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const fs = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
const fsPromise = fs.promise;
const fetch = require('node-fetch');
const helper = require('./testHelper')(fsPromise);

const FILENAME = 'unlink.txt';

describe('unlink', () => {
  beforeEach(async () => {
    await helper.ensureUnlinkIfExists(FILENAME);
    await helper.ensureWriteFile(FILENAME, 'TEST');
  });

  afterEach(async () => await helper.ensureUnlinkIfExists(FILENAME));

  context('when deleting the file', () => {
    beforeEach(async () => {
      await fsPromise.unlink(FILENAME);
      await helper.ensureNotExists(FILENAME);
    });

    it('should have deleted the file', async () => {
      try {
        await fsPromise.stat(FILENAME);
        throw new Error();
      } catch (err) {
        assert.equal('ENOENT', err.code);
      }
    });

    it('should return 404 on GET', async () => {
      const now = Date.now();
      const token = fs.sas(FILENAME, { expiry: now + 15 * 60000 });
      const url = `https://${ env.BLOB_ACCOUNT_NAME }.blob.core.windows.net/${ env.BLOB_CONTAINER }/${ FILENAME }?${ token }`;
      const res = await fetch(url);

      assert.equal(404, res.status);
    });
  });
});
