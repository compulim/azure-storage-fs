'use strict';

describe('rmdir', () => {
  let fs, helper;

  beforeEach(async () => {
    fs     = await require('../../testUtils/createAzureBlobFS')();
    helper = require('../../testUtils/testHelper')(fs.promise);

    await Promise.all([
      helper.ensureUnlinkIfExists('rmdir/test.txt'),
      helper.ensureRmdirIfExists('rmdir/dir')
    ]);

    await helper.ensureRmdirIfExists('rmdir');
    await fs.promise.mkdir('rmdir');
    await helper.ensureExists('rmdir');
  });

  test('should have created "rmdir" folder', async () => {
    const stat = await fs.promise.stat('rmdir');

    expect(stat.isDirectory()).toBe(true);
  });

  describe('with a file', () => {
    beforeEach(async () => {
      await helper.ensureWriteFile('rmdir/test.txt', 'TEST');
    });

    afterEach(async () => {
      await helper.ensureUnlinkIfExists('rmdir/test.txt');
    });

    test('should have create "rmdir/test.txt" file', async () => {
      const stat = await fs.promise.stat('rmdir/test.txt');

      expect(!stat.isDirectory()).toBe(true);
      expect(stat.size).toBe(4);
    });

    test('removing the directory should throw ENOTEMPTY', () => {
      return expect(fs.promise.rmdir('rmdir')).rejects.toHaveProperty('code', 'ENOTEMPTY');
    });

    test('remove the file and subdirectory and remove the directory should have removed the directory', async () => {
      await helper.ensureUnlinkIfExists('rmdir/test.txt');
      await helper.ensureRmdirIfExists('rmdir');
      await helper.ensureNotExists('rmdir');
    });
  });

  describe('with a subdirectory', () => {
    beforeEach(async () => {
      await fs.promise.mkdir('rmdir/dir');
      await helper.ensureExists('rmdir/dir');
    });

    afterEach(async () => {
      await helper.ensureRmdirIfExists('rmdir/dir');
    });

    test('remove the root directory should throw "ENOTEMPTY"', () => {
      return expect(fs.promise.rmdir('rmdir')).rejects.toHaveProperty('code', 'ENOTEMPTY');
    });

    test('remove the subdirectory first then remove the root directory should have removed everything', async () => {
      await fs.promise.rmdir('rmdir/dir');
      await helper.ensureNotExists('rmdir/dir');
      await fs.promise.rmdir('rmdir');
      await helper.ensureNotExists('rmdir');
    });
  });
});