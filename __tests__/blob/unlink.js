'use strict';

require('dotenv').config();

const fetch  = require('node-fetch');

const FILENAME = 'unlink.txt';

describe('unlink', () => {
  let fs, helper;

  beforeEach(async () => {
    fs     = await require('../../testUtils/createAzureBlobFS')();
    helper = require('../../testUtils/testHelper')(fs.promise);

    await helper.ensureUnlinkIfExists(FILENAME);
    await helper.ensureWriteFile(FILENAME, 'TEST');
  });

  afterEach(async () => await helper.ensureUnlinkIfExists(FILENAME));

  describe('when deleting the file', () => {
    beforeEach(async () => {
      await fs.promise.unlink(FILENAME);
      await helper.ensureNotExists(FILENAME);
    });

    test('should have deleted the file', async () => {
      return expect(fs.promise.stat(FILENAME)).rejects.toHaveProperty('code', 'ENOENT');
    });

    test('should return 404 on GET', async () => {
      const now = Date.now();
      const token = fs.sas(FILENAME, { expiry: now + 15 * 60000 });
      const url = `https://${ process.env.AZURE_STORAGE_ACCOUNT }.blob.core.windows.net/${ process.env.TEST_CONTAINER }/${ FILENAME }?${ token }`;
      const res = await fetch(url);

      expect(res.status).toBe(404);
    });
  });
});
