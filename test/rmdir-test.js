'use strict';

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const { promise: fsPromise } = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
const helper = require('./testHelper')(fsPromise);

describe('rmdir', () => {
  beforeEach(async () => {
    await helper.ensureUnlinkIfExists('rmdir/test.txt');
    await helper.ensureRmdirIfExists('rmdir/dir');
    await helper.ensureRmdirIfExists('rmdir');

    await fsPromise.mkdir('rmdir');
    await helper.ensureExists('rmdir');
  });

  it('should have created "rmdir" folder', async () => {
    const stat = await fsPromise.stat('rmdir');

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
      const stat = await fsPromise.stat('rmdir/test.txt');

      assert.equal(true, !stat.isDirectory());
      assert.equal(4, stat.size);
    });

    context('removing the directory', () => {
      it('should throw ENOTEMPTY', async () => {
        try {
          await fsPromise.rmdir('rmdir');
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
      await fsPromise.mkdir('rmdir/dir');
      await helper.ensureExists('rmdir/dir');
    });

    afterEach(async () => {
      await helper.ensureRmdirIfExists('rmdir/dir');
    });

    context('remove the root directory', () => {
      it('should throw "ENOTEMPTY"', async () => {
        try {
          await fsPromise.rmdir('rmdir');
          throw new Error('did not throw ENOTEMPTY');
        } catch (err) {
          assert.equal('ENOTEMPTY', err.code);
        }
      });
    });

    context('remove the subdirectory first', () => {
      beforeEach(async () => {
        await fsPromise.rmdir('rmdir/dir');
        await helper.ensureNotExists('rmdir/dir');
      });

      context('then remove the root directory', () => {
        beforeEach(async () => {
          await fsPromise.rmdir('rmdir');
        });

        it('should have removed everything', async () => {
          await helper.ensureNotExists('rmdir');
        });
      });
    });
  });
});