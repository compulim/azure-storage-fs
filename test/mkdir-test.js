'use strict';

const assert = require('assert');

describe('mkdir', () => {
  let fs, helper;

  before(async () => {
    fs     = await require('./createAzureBlobFS')();
    helper = require('./testHelper')(fs.promise);
  });

  beforeEach(async () => {
    await helper.ensureRmdirIfExists('mkdir');
    await fs.promise.mkdir('mkdir');
    await helper.ensureExists('mkdir');
  });

  afterEach(async () => {
    await helper.ensureRmdirIfExists('mkdir');
  });

  it('should created the directory', async () => {
    const stat = await fs.promise.stat('mkdir');

    assert.equal(true, stat.isDirectory());
  });

  context('recreate the existing directory', () => {
    it('should throw EEXIST', async () => {
      try {
        await fs.promise.mkdir('mkdir');
        throw new Error('recreate directory should not success');
      } catch (err) {
        if (err.code !== 'EEXIST') {
          throw err;
        }
      }
    });
  });
});