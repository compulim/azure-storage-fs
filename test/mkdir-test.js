'use strict';

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const { promise: fsPromise } = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
const helper = require('./testHelper')(fsPromise);

describe('mkdir', () => {
  beforeEach(async () => {
    await helper.ensureRmdirIfExists('mkdir');
    await fsPromise.mkdir('mkdir');
    await helper.ensureExists('mkdir');
  });

  afterEach(async () => {
    await helper.ensureRmdirIfExists('mkdir');
  });

  it('should created the directory', async () => {
    const stat = await fsPromise.stat('mkdir');

    assert.equal(true, stat.isDirectory());
  });

  context('recreate the existing directory', () => {
    it('should throw EEXIST', async () => {
      try {
        await fsPromise.mkdir('mkdir');
        throw new Error('recreate directory should not success');
      } catch (err) {
        if (err.code !== 'EEXIST') {
          throw err;
        }
      }
    });
  });
});