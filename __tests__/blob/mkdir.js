'use strict';

const assert = require('assert');

describe('mkdir', () => {
  let fs, helper;

  beforeEach(async () => {
    fs     = await require('../../testUtils/createAzureBlobFS')();
    helper = require('../../testUtils/testHelper')(fs.promise);

    await helper.ensureRmdirIfExists('mkdir');
    await fs.promise.mkdir('mkdir');
    await helper.ensureExists('mkdir');
  });

  afterEach(async () => {
    await helper.ensureRmdirIfExists('mkdir');
  });

  test('should created the directory', async () => {
    const stat = await fs.promise.stat('mkdir');

    assert.equal(true, stat.isDirectory());
  });

  describe('recreate the existing directory', () => {
    test('should throw EEXIST', async () => {
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