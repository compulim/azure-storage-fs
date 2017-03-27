'use strict'

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const { promise: fsPromise } = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
const PREFIX = env.BLOB_PREFIX ? env.BLOB_PREFIX + '/' : '';
const TEST_FILENAME = PREFIX + 'readFile.txt';
const { ensure, ensureNot, unlinkIfExist } = require('./utils');

describe('readFile', () => {
  beforeEach(async () => {
    await unlinkIfExist(fsPromise, TEST_FILENAME);
    await fsPromise.writeFile(TEST_FILENAME, 'Hello, World!');
    await ensure(fsPromise, TEST_FILENAME);
  });

  afterEach(async () => {
    await fsPromise.unlink(TEST_FILENAME);
    await ensureNot(fsPromise, TEST_FILENAME);
  });

  describe('read a text file', () => {
    let content;

    beforeEach(async () => {
      content = await fsPromise.readFile(TEST_FILENAME);
    });

    it('should be of type Buffer', () => {
      assert(content instanceof Buffer);
    });

    it('should return the content of the file', () => {
      assert.equal(content.toString(), 'Hello, World!');
    });
  });
});
