'use strict'

require('dotenv').config();

const AzureBlobFS  = require('../../lib/AzureBlobFS');
const azureStorage = require('azure-storage');

const FILENAME = 'constructor.txt';

describe('constructor', () => {
  describe('construct using BlobService object', () => {
    let fs, helper;

    beforeEach(async () => {
      await require('../../testUtils/createAzureBlobFS')();

      fs = new AzureBlobFS(azureStorage.createBlobService(), process.env.TEST_CONTAINER);

      helper = require('../../testUtils/testHelper')(fs.promise);

      await helper.ensureUnlinkIfExists(FILENAME);
      await helper.ensureWriteFile(FILENAME, 'Hello, World!');
    });

    afterEach(async () => {
      await helper.ensureUnlinkIfExists(FILENAME);
    });

    test('should read/write file', async () => {
      const buffer = await fs.promise.readFile(FILENAME);

      expect(buffer.toString()).toBe('Hello, World!');
    });
  });

  describe('construct by letting BlobService to read from environment variable', () => {
    let fs, helper;

    beforeEach(async () => {
      await require('../../testUtils/createAzureBlobFS')();

      fs = new AzureBlobFS(null, null, process.env.TEST_CONTAINER);

      helper = require('../../testUtils/testHelper')(fs.promise);

      await helper.ensureUnlinkIfExists(FILENAME);
      await helper.ensureWriteFile(FILENAME, 'Hello, World!');
    });

    afterEach(async () => {
      await helper.ensureUnlinkIfExists(FILENAME);
    });

    test('should read/write file', async () => {
      const content = await fs.promise.readFile(FILENAME);

      expect(content.toString()).toBe('Hello, World!');
    });
  });
});
