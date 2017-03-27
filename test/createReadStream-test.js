'use strict'

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const fs = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
const fsPromise = fs.promise;
const PREFIX = env.BLOB_PREFIX ? env.BLOB_PREFIX + '/' : '';
const TEST_FILENAME = PREFIX + 'createReadStream.txt';
const { unlinkIfExist } = require('./utils');

describe('createReadStream', () => {
  beforeEach(async () => {
    await unlinkIfExist(fsPromise, TEST_FILENAME);
    await fsPromise.writeFile(TEST_FILENAME, 'Hello, World!');
  });

  afterEach(() => {
    return fsPromise.unlink(TEST_FILENAME);
  });

  describe('create a stream', () => {
    let readStream;

    beforeEach(() => {
      readStream = fs.createReadStream(TEST_FILENAME);
    });

    describe('dump the stream', () => {
      let content;

      beforeEach(async () => {
        content = await readAll(readStream);
      });

      it('should return the content of the file', () => {
        assert.equal(content.toString(), 'Hello, World!');
      });
    });
  });
});

function readAll(stream) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    let numBytes = 0;

    stream
      .on('data', data => {
        buffers.push(data);
        numBytes += data.length;
      })
      .on('end', () => {
        resolve(Buffer.concat(buffers, numBytes));
      })
      .on('error', err => {
        reject(err)
      })
      .resume();
  });
}