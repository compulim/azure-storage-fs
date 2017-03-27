'use strict'

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const fs = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
const fsPromise = fs.promise;
const helper = require('./testHelper')(fsPromise);

const FILENAME = 'createReadStream.txt';

describe('createReadStream', () => {
  beforeEach(async () => {
    await helper.ensureUnlinkIfExists(FILENAME);
    await helper.ensureWriteFile(FILENAME, 'Hello, World!');
  });

  afterEach(async () => {
    await helper.ensureUnlinkIfExists(FILENAME);
  });

  describe('create a stream', () => {
    let readStream;

    beforeEach(() => {
      readStream = fs.createReadStream(FILENAME);
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