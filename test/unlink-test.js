'use strict';

require('dotenv').config();

const assert = require('assert');
const fetch  = require('node-fetch');

const FILENAME = 'unlink.txt';

describe('unlink', () => {
  let fs, helper;

  before(async () => {
    fs     = await require('./createAzureBlobFS')();
    helper = require('./testHelper')(fs.promise);
  });

  beforeEach(async () => {
    await helper.ensureUnlinkIfExists(FILENAME);
    await helper.ensureWriteFile(FILENAME, 'TEST');
  });

  afterEach(async () => await helper.ensureUnlinkIfExists(FILENAME));

  context('when deleting the file', () => {
    beforeEach(async () => {
      await fs.promise.unlink(FILENAME);
      await helper.ensureNotExists(FILENAME);
    });

    it('should have deleted the file', async () => {
      try {
        await fs.promise.stat(FILENAME);
        throw new Error();
      } catch (err) {
        assert.equal('ENOENT', err.code);
      }
    });

    it('should return 404 on GET', async () => {
      const now = Date.now();
      const token = fs.sas(FILENAME, { expiry: now + 15 * 60000 });
      const url = `https://${ process.env.AZURE_STORAGE_ACCOUNT }.blob.core.windows.net/${ process.env.TEST_CONTAINER }/${ FILENAME }?${ token }`;
      const res = await fetch(url);

      assert.equal(404, res.status);
    });
  });
});
