'use strict';

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

    expect(stat.isDirectory()).toBe(true);
  });

  test('recreate existing directory should throw EEXIST', () => {
    return expect(fs.promise.mkdir('mkdir')).rejects.toHaveProperty('code', 'EEXIST');
  });
});