'use strict'

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const stream = require('stream');
const { env } = process;
const fs = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
const fsPromise = fs.promise;
const PREFIX = env.BLOB_PREFIX ? env.BLOB_PREFIX + '/' : '';
const TEST_FILENAME = PREFIX + 'snapshot.txt';

describe('snapshot', () => {
  beforeEach(() => {
    return fsPromise.unlink(TEST_FILENAME).catch(err => {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }).then(() => fsPromise.writeFile(TEST_FILENAME, 'Hello, World!', { metadata: { version: '1' } }));
  });

  afterEach(() => fsPromise.unlink(TEST_FILENAME));

  describe('create a snapshot with version set to "2"', () => {
    let firstSnapshot;

    beforeEach(async () => {
      firstSnapshot = await fsPromise.snapshot(TEST_FILENAME, { metadata: { version: '2' } });
    });

    describe('when stat-ing without specifying snapshot ID', () => {
      let stat;

      beforeEach(async () => {
        stat = await fsPromise.stat(TEST_FILENAME, { metadata: true });
      });

      it('should returns version equals to "1"', () => assert.deepEqual(stat.metadata, { version: '1' }));
    });

    describe('when stat-ing the new snapshot', () => {
      let stat;

      beforeEach(async () => {
        stat = await fsPromise.stat(TEST_FILENAME, { metadata: true, snapshot: firstSnapshot });
      });

      it('should returns version equals to "2"', () => assert.deepEqual(stat.metadata, { version: '2' }));
    });

    describe('overwrite the file with new content', () => {
      beforeEach(() => {
        return fsPromise.writeFile(TEST_FILENAME, 'Aloha!', { metadata: { version: '3' } });
      });

      describe('when reading the file with snapshot ID', () => {
        let content;

        beforeEach(async () => {
          content = await fsPromise.readFile(TEST_FILENAME, { snapshot: firstSnapshot });
        });

        it('should return original content', () => assert.equal('Hello, World!', content));
      });

      describe('when reading the file without specifying snapshot ID', () => {
        let content;

        beforeEach(async () => {
          content = await fsPromise.readFile(TEST_FILENAME);
        });

        it('should return the new content', () => {
          assert.equal('Aloha!', content);
        });
      });

      describe('when stat-ing the file with snapshot ID', () => {
        let stat;

        beforeEach(async () => {
          stat = await fsPromise.stat(TEST_FILENAME, { metadata: true, snapshot: firstSnapshot });
        });

        it('should return version equals to "2"', () => assert.deepEqual(stat.metadata, { version: '2' }));
      });

      describe('when stat-ing the file with all snapshots and metadata', () => {
        let stat;

        beforeEach(async () => {
          stat = await fsPromise.stat(TEST_FILENAME, { metadata: true, snapshot: true });
        });

        it('should return version equals to "3"', () => {
          assert.deepEqual(stat.metadata, { version: '3' });
        });

        it('should return two snapshots', () => {
          const cleanSnapshots = stat.snapshots.map(snapshot => ({
            id      : snapshot.id,
            metadata: snapshot.metadata,
            size    : snapshot.size,
            url     : snapshot.url
          }));

          assert.deepEqual(cleanSnapshots, [{
            id      : firstSnapshot,
            metadata: { version: '2' },
            size    : 13,
            url     : `https://${ env.BLOB_ACCOUNT_NAME }.blob.core.windows.net/${ env.BLOB_CONTAINER }/${ TEST_FILENAME }?snapshot=${ encodeURIComponent(firstSnapshot) }`
          }, {
            id      : undefined,
            metadata: { version: '3' },
            size    : 6,
            url     : `https://${ env.BLOB_ACCOUNT_NAME }.blob.core.windows.net/${ env.BLOB_CONTAINER }/${ TEST_FILENAME }`
          }]);
        });
      });
    });
  });
});
