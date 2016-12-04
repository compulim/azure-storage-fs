'use strict';

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const fsPromise = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER).promise;

describe('mkdir', () => {
  beforeEach(async () => await fsPromise.mkdir('mkdir'));

  afterEach(async () => await fsPromise.rmdir('mkdir'));

  it('should created the directory', async () => {
    const stat = await fsPromise.stat('mkdir');

    assert.equal(true, stat.isDirectory());
  });

  context('recreate the existing directory', () => {
    it('should throw EEXIST', async () => {
      try {
        await fsPromise.mkdir('mkdir');
        throw new Error();
      } catch (err) {
        if (err.code !== 'EEXIST') {
          throw err;
        }
      }
    });
  });
});