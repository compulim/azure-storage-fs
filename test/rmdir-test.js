'use strict';

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const { promise: fsPromise } = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
const { ensure, ensureNot, ensureRmdirIfExist, ensureUnlinkIfExist, unlinkIfExist } = require('./utils');

describe('rmdir', () => {
  beforeEach(async () => {
    await ensureUnlinkIfExist(fsPromise, 'rmdir/test.txt');
    await ensureRmdirIfExist(fsPromise, 'rmdir/dir');
    await ensureRmdirIfExist(fsPromise, 'rmdir');

    await fsPromise.mkdir('rmdir');
    await ensure(fsPromise, 'rmdir/$$$.$$$');
  });

  context('with a file', () => {
    beforeEach(async () => {
      await fsPromise.writeFile('rmdir/test.txt', 'TEST');
      await ensure(fsPromise, 'rmdir/test.txt');
    });

    afterEach(async () => {
      await ensureUnlinkIfExist(fsPromise, 'rmdir/test.txt');
    });

    it('should have created "rmdir" folder', async () => {
      const stat = await fsPromise.stat('rmdir');

      assert.equal(true, stat.isDirectory());
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
          throw new Error();
        } catch (err) {
          assert.equal('ENOTEMPTY', err.code);
        }
      });
    });

    context('remove the file and subdirectory', () => {
      beforeEach(async () => {
        await ensureUnlinkIfExist(fsPromise, 'rmdir/test.txt');
      });

      context('remove the directory', () => {
        beforeEach(async () => {
          await fsPromise.rmdir('rmdir');
          await ensureNot(fsPromise, 'rmdir/$$$.$$$');
        });

        it('should have removed the directory', async () => {
          try {
            const stat = await fsPromise.stat('rmdir');
            throw new Error();
          } catch (err) {
            assert.equal('ENOENT', err.code);
          }
        });
      });
    });
  });

  context('with a subdirectory', () => {
    beforeEach(async () => {
      await fsPromise.mkdir('rmdir/dir');
      await ensure(fsPromise, 'rmdir/dir/$$$.$$$');
    });

    afterEach(async () => {
      await ensureRmdirIfExist(fsPromise, 'rmdir/dir');
    });

    context('remove the directory', () => {
      it('should throw "ENOTEMPTY"', async () => {
        try {
          await fsPromise.rmdir('rmdir');
          throw new Error();
        } catch (err) {
          assert.equal('ENOTEMPTY', err.code);
        }
      });
    });

    context('remove the subdirectory', () => {
      beforeEach(async () => {
        await fsPromise.rmdir('rmdir/dir');
        await ensureNot(fsPromise, 'rmdir/dir');
      });

      context('remove the directory', () => {
        beforeEach(async () => {
          await fsPromise.rmdir('rmdir');
          await ensureNot(fsPromise, 'rmdir');
        });

        it('should have removed the directory', async () => {
          try {
            await fsPromise.stat('rmdir');
            throw new Error();
          } catch (err) {
            assert.equal('ENOENT', err.code);
          }
        });
      });
    });
  });
});