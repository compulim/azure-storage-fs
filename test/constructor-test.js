'use strict'

require('dotenv').config();

const assert       = require('assert');
const AzureBlobFS  = require('../lib/AzureBlobFS');
const azureStorage = require('azure-storage');

const FILENAME = 'constructor.txt';

describe('constructor', () => {
  describe('construct using BlobService object', () => {
    let fs, helper;

    before(async () => {
      await require('./createAzureBlobFS')();

      fs = new AzureBlobFS(azureStorage.createBlobService(), process.env.TEST_CONTAINER);

      helper = require('./testHelper')(fs.promise);
    });

    beforeEach(async () => {
      await helper.ensureUnlinkIfExists(FILENAME);
      await helper.ensureWriteFile(FILENAME, 'Hello, World!');
    });

    afterEach(async () => {
      await helper.ensureUnlinkIfExists(FILENAME);
    });

    describe('read/write a text file', () => {
      let content;

      beforeEach(async () => {
        content = await fs.promise.readFile(FILENAME);
      });

      it('should return the content of the file', () => {
        assert.equal(content.toString(), 'Hello, World!');
      });
    });
  });

  describe('construct by letting BlobService to read from environment variable', () => {
    let fs, helper;

    before(async () => {
      await require('./createAzureBlobFS')();

      fs = new AzureBlobFS(null, null, process.env.TEST_CONTAINER);

      helper = require('./testHelper')(fs.promise);
    });

    beforeEach(async () => {
      await helper.ensureUnlinkIfExists(FILENAME);
      await helper.ensureWriteFile(FILENAME, 'Hello, World!');
    });

    afterEach(async () => {
      await helper.ensureUnlinkIfExists(FILENAME);
    });

    describe('read/write a text file', () => {
      let content;

      beforeEach(async () => {
        content = await fs.promise.readFile(FILENAME);
      });

      it('should return the content of the file', () => {
        assert.equal(content.toString(), 'Hello, World!');
      });
    });
  });
});
