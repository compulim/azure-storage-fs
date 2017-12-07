'use strict';

const assert = require('assert');

describe('rmdir', () => {
  let fs, helper;

  before(async () => {
    fs     = await require('./createAzureBlobFS')();
    helper = require('./testHelper')(fs.promise);
  });

  beforeEach(async () => {
    await helper.ensureUnlinkIfExists('rmdir/test.txt');
    await helper.ensureRmdirIfExists('rmdir/dir');
    await helper.ensureRmdirIfExists('rmdir');

    await fs.promise.mkdir('rmdir');
    await helper.ensureExists('rmdir');
  });

  it('should have created "rmdir" folder', async () => {
    const stat = await fs.promise.stat('rmdir');

    assert.equal(true, stat.isDirectory());
  });

  context('with a file', () => {
    beforeEach(async () => {
      await helper.ensureWriteFile('rmdir/test.txt', 'TEST');
    });

    afterEach(async () => {
      await helper.ensureUnlinkIfExists('rmdir/test.txt');
    });

    it('should have create "rmdir/test.txt" file', async () => {
      const stat = await fs.promise.stat('rmdir/test.txt');

      assert.equal(true, !stat.isDirectory());
      assert.equal(4, stat.size);
    });

    context('removing the directory', () => {
      it('should throw ENOTEMPTY', async () => {
        try {
          await fs.promise.rmdir('rmdir');
          throw new Error('did not throw ENOTEMPTY');
        } catch (err) {
          assert.equal('ENOTEMPTY', err.code);
        }
      });
    });

    context('remove the file and subdirectory', () => {
      beforeEach(async () => {
        await helper.ensureUnlinkIfExists('rmdir/test.txt');
      });

      context('remove the directory', () => {
        beforeEach(async () => {
          await helper.ensureRmdirIfExists('rmdir');
        });

        it('should have removed the directory', async () => {
          await helper.ensureNotExists('rmdir');
        });
      });
    });
  });

  context('with a subdirectory', () => {
    beforeEach(async () => {
      await fs.promise.mkdir('rmdir/dir');
      await helper.ensureExists('rmdir/dir');
    });

    afterEach(async () => {
      await helper.ensureRmdirIfExists('rmdir/dir');
    });

    context('remove the root directory', () => {
      it('should throw "ENOTEMPTY"', async () => {
        try {
          await fs.promise.rmdir('rmdir');
          throw new Error('did not throw ENOTEMPTY');
        } catch (err) {
          assert.equal('ENOTEMPTY', err.code);
        }
      });
    });

    context('remove the subdirectory first', () => {
      beforeEach(async () => {
        await fs.promise.rmdir('rmdir/dir');
        await helper.ensureNotExists('rmdir/dir');
      });

      context('then remove the root directory', () => {
        beforeEach(async () => {
          await fs.promise.rmdir('rmdir');
        });

        it('should have removed everything', async () => {
          await helper.ensureNotExists('rmdir');
        });
      });
    });
  });
});