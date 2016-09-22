'use strict'

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const stream = require('stream');
const { env } = process;
const fs = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
const fsPromise = fs.promise;
const PREFIX = env.BLOB_PREFIX ? env.BLOB_PREFIX + '/' : '';
const TEST_FILENAME = PREFIX + 'snapshot.txt';

describe('snapshot', () => {
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

  describe('create a snapshot', () => {
    let firstSnapshot;

    beforeEach(async () => {
      firstSnapshot = await fsPromise.snapshot(TEST_FILENAME);
    });

    describe('overwrite the file with new content', () => {
      beforeEach(() => {
        return fsPromise.writeFile(TEST_FILENAME, 'Aloha!');
      });

      describe('when reading the file with snapshot ID', () => {
        let content;

        beforeEach(async () => {
          content = await fsPromise.readFile(TEST_FILENAME, { snapshot: firstSnapshot });
        });

        it('should return original content', () => {
          assert.equal('Hello, World!', content);
        });
      });

      describe('when reading the file without specifying snapshot ID', () => {
        let content;

        beforeEach(async () => {
          content = await fsPromise.readFile(TEST_FILENAME);
        });

        it('should return the new content', () => {
          assert.equal('Aloha!', content);
        });
      });
    });
  });
});
