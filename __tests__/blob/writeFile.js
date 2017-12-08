'use strict';

require('dotenv').config();

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

      expect(res.status).toBe(200);

      const content = await res.text();

      expect(content).toBe('TEST');
    });

    describe('when stat-ing the file', () => {
      let stat;

      beforeEach(async () => {
        stat = await fs.promise.stat(FILENAME, { metadata: true });
      });

      test('should have a file size of 4 bytes', () => {
        expect(stat.size).toBe(4);
      });

      test('should not be a directory', () => {
        expect(stat.isDirectory()).toBe(false);
      });

      test('should have metadata "hello" equals to "Aloha!"', () => {
        expect(stat.metadata).toEqual({ hello: 'Aloha!' });
      });

      test('should have "Content-Settings" set to "text/plain"', () => {
        expect(stat.contentSettings.contentType).toBe('text/plain');
      });
    });
  });
});
