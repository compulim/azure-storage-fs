'use strict';

const assert = require('assert');

describe('rmdir', () => {
  let fs, helper;

  beforeEach(async () => {
    fs     = await require('../../testUtils/createAzureBlobFS')();
    helper = require('../../testUtils/testHelper')(fs.promise);

    await helper.ensureUnlinkIfExists('rmdir/test.txt');
    await helper.ensureRmdirIfExists('rmdir/dir');
    await helper.ensureRmdirIfExists('rmdir');

    await fs.promise.mkdir('rmdir');
    await helper.ensureExists('rmdir');
  });

  test('should have created "rmdir" folder', async () => {
    const stat = await fs.promise.stat('rmdir');

    assert.equal(true, stat.isDirectory());
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

      assert.equal(true, !stat.isDirectory());
      assert.equal(4, stat.size);
    });

    describe('removing the directory', () => {
      test('should throw ENOTEMPTY', async () => {
        try {
          await fs.promise.rmdir('rmdir');
          throw new Error('did not throw ENOTEMPTY');
        } catch (err) {
          assert.equal('ENOTEMPTY', err.code);
        }
      });
    });

    describe('remove the file and subdirectory', () => {
      beforeEach(async () => {
        await helper.ensureUnlinkIfExists('rmdir/test.txt');
      });

      describe('remove the directory', () => {
        beforeEach(async () => {
          await helper.ensureRmdirIfExists('rmdir');
        });

        test('should have removed the directory', async () => {
          await helper.ensureNotExists('rmdir');
        });
      });
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

    describe('remove the root directory', () => {
      test('should throw "ENOTEMPTY"', async () => {
        try {
          await fs.promise.rmdir('rmdir');
          throw new Error('did not throw ENOTEMPTY');
        } catch (err) {
          assert.equal('ENOTEMPTY', err.code);
        }
      });
    });

    describe('remove the subdirectory first', () => {
      beforeEach(async () => {
        await fs.promise.rmdir('rmdir/dir');
        await helper.ensureNotExists('rmdir/dir');
      });

      describe('then remove the root directory', () => {
        beforeEach(async () => {
          await fs.promise.rmdir('rmdir');
        });

        test('should have removed everything', async () => {
          await helper.ensureNotExists('rmdir');
        });
      });
    });
  });
});