'use strict'

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const { promise: fsPromise } = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
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
