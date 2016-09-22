'use strict'

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const fsPromise = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER).promise;
const PREFIX = env.BLOB_PREFIX ? env.BLOB_PREFIX + '/' : '';
const TEST_FILENAME = PREFIX + 'readFile.txt';

describe('readFile', () => {
  beforeEach(() => {
    return fsPromise.unlink(TEST_FILENAME).catch(err => {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }).then(() => fsPromise.writeFile(TEST_FILENAME, 'Hello, World!'));
  });

  afterEach(() => {
    return fsPromise.unlink(TEST_FILENAME);
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
