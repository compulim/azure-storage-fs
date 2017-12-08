'use strict';

require('dotenv').config();

const assert = require('assert');
const fetch  = require('node-fetch');

const FILENAME = 'writeFile.txt';

describe('writeFile', () => {
  let fs, helper;

  beforeEach(async () => {
    fs     = await require('../../testUtils/createAzureBlobFS')();
    helper = require('../../testUtils/testHelper')(fs.promise);
  });

  describe(`when write "TEST" to "${ FILENAME }"`, () => {
    beforeEach(async () => {
      await helper.ensureUnlinkIfExists(FILENAME);
      await fs.promise.writeFile(FILENAME, 'TEST', { contentSettings: { contentType: 'text/plain' }, metadata: { hello: 'Aloha!' } });
    });

    afterEach(async () => await helper.ensureUnlinkIfExists(FILENAME));

    test('should have wrote "TEST" to the file', async () => {
      const now = Date.now();
      const token = fs.sas(FILENAME, { expiry: now + 15 * 60000, flag: 'r' });
      const url = `https://${ process.env.AZURE_STORAGE_ACCOUNT }.blob.core.windows.net/${ process.env.TEST_CONTAINER }/writeFile.txt?${ token }`;
      const res = await fetch(url);

      assert.equal(res.status, 200);

      const content = await res.text();

      assert.equal(content, 'TEST');
    });

    describe('when stat-ing the file', () => {
      let stat;

      beforeEach(async () => {
        stat = await fs.promise.stat(FILENAME, { metadata: true });
      });

      test('should have a file size of 4 bytes', () => {
        assert.equal(stat.size, 4);
      });

      test('should not be a directory', () => {
        assert.equal(stat.isDirectory(), false);
      });

      test('should have metadata "hello" equals to "Aloha!"', () => {
        assert.deepEqual(stat.metadata, { hello: 'Aloha!' });
      });

      test('should have "Content-Settings" set to "text/plain"', () => {
        assert.equal(stat.contentSettings.contentType, 'text/plain');
      });
    });
  });
});
