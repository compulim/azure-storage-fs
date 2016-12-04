'use strict';

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const fsPromise = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER).promise;

describe('rmdir', () => {
  context('with a file', () => {
    beforeEach(async () => {
      await fsPromise.mkdir('rmdir');
      await fsPromise.writeFile('rmdir/test.txt', 'TEST');
    });

    afterEach(async () => {
      try {
        await fsPromise.unlink('rmdir/test.txt');
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }

      try {
        await fsPromise.rmdir('rmdir');
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
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
      beforeEach(async () => await fsPromise.unlink('rmdir/test.txt'));

      context('remove the directory', () => {
        beforeEach(async () => await fsPromise.rmdir('rmdir'));

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
      await fsPromise.mkdir('rmdir');
      await fsPromise.mkdir('rmdir/dir');
    });

    afterEach(async () => {
      try {
        await fsPromise.rmdir('rmdir/dir');
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }

      try {
        await fsPromise.rmdir('rmdir');
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
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
      beforeEach(async () => await fsPromise.rmdir('rmdir/dir'));

      context('remove the directory', () => {
        beforeEach(async () => await fsPromise.rmdir('rmdir'));

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