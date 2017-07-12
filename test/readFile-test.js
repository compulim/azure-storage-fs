'use strict'

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const config = require('./config');
const { promise: fsPromise } = new AzureBlobFS(config.BLOB_ACCOUNT_NAME, config.BLOB_SECRET, config.BLOB_CONTAINER);
const helper = require('./testHelper')(fsPromise);

const FILENAME = 'readFile.txt';

describe('readFile', () => {
  beforeEach(async () => {
    await helper.ensureUnlinkIfExists(FILENAME);
    await helper.ensureWriteFile(FILENAME, 'Hello, World!');
  });

  afterEach(async () => {
    await helper.ensureUnlinkIfExists(FILENAME);
  });

  describe('read a text file', () => {
    let content;

    beforeEach(async () => {
      content = await fsPromise.readFile(FILENAME);
    });

    it('should be of type Buffer', () => {
      assert(content instanceof Buffer);
    });

    it('should return the content of the file', () => {
      assert.equal(content.toString(), 'Hello, World!');
    });
  });
});
