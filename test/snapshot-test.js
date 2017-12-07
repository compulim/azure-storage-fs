'use strict'

require('dotenv').config();

const assert = require('assert');
const fs     = require('./createAzureBlobFS');
const helper = require('./testHelper')(fs.promise);
const retry  = require('promise-retry');
const stream = require('stream');

const FILENAME = 'snapshot.txt';

describe('snapshot', () => {
  beforeEach(async () => {
    await helper.ensureUnlinkIfExists(FILENAME);
    await helper.ensureWriteFile(FILENAME, 'Hello, World!', { contentSettings: { contentType: 'text/plain' }, metadata: { version: '1' } });
  });

  afterEach(async () => await helper.ensureUnlinkIfExists(FILENAME));

  describe('create a snapshot with version set to "2"', () => {
    let firstSnapshot;

    beforeEach(async () => {
      firstSnapshot = await fs.promise.snapshot(FILENAME, { metadata: { version: '2' } });
    });

    describe('when stat-ing without specifying snapshot ID', () => {
      let stat;

      beforeEach(async () => {
        stat = await fs.promise.stat(FILENAME, { metadata: true });
      });

      it('should returns version equals to "1"', () => assert.deepEqual(stat.metadata, { version: '1' }));
      it('should returns "Content-Type" as "text/plain"', () => assert.equal(stat.contentSettings.contentType, 'text/plain'));
    });

    describe('when stat-ing the new snapshot', () => {
      let stat;

      beforeEach(async () => {
        stat = await fs.promise.stat(FILENAME, { metadata: true, snapshot: firstSnapshot });
      });

      it('should returns version equals to "2"', () => assert.deepEqual(stat.metadata, { version: '2' }));
      it('should returns "Content-Type" as "text/plain"', () => assert.equal(stat.contentSettings.contentType, 'text/plain'));
    });

    describe('overwrite the file with new content', () => {
      beforeEach(async () => {
        await fs.promise.writeFile(FILENAME, 'Aloha!', { contentSettings: { contentType: 'text/html' }, metadata: { version: '3' } });
        await helper.ensureStat(FILENAME, stat => stat.metadata.version === '3');
      });

      describe('when reading the file with snapshot ID', () => {
        let content;

        beforeEach(async () => {
          content = await fs.promise.readFile(FILENAME, { snapshot: firstSnapshot });
        });

        it('should return original content', () => assert.equal('Hello, World!', content));
      });

      describe('when reading the file without specifying snapshot ID', () => {
        let content;

        beforeEach(async () => {
          content = await fs.promise.readFile(FILENAME);
        });

        it('should return the new content', () => assert.equal('Aloha!', content));
      });

      describe('when stat-ing the file with snapshot ID', () => {
        let stat;

        beforeEach(async () => {
          stat = await fs.promise.stat(FILENAME, { metadata: true, snapshot: firstSnapshot });
        });

        it('should return version equals to "2"', () => assert.deepEqual(stat.metadata, { version: '2' }));
        it('should returns "Content-Type" as "text/plain"', () => assert.equal(stat.contentSettings.contentType, 'text/plain'));
      });

      describe('when stat-ing the file with all snapshots and metadata', () => {
        let stat;

        beforeEach(async () => {
          stat = await fs.promise.stat(FILENAME, { metadata: true, snapshot: true });
        });

        it('should return version equals to "3"', () => assert.deepEqual(stat.metadata, { version: '3' }));
        it('should returns "Content-Type" as "text/html"', () => assert.equal(stat.contentSettings.contentType, 'text/html'));

        it('should return two snapshots', () => {
          const cleanSnapshots = stat.snapshots.map(snapshot => ({
            contentSettings: { contentType: snapshot.contentSettings.contentType },
            id             : snapshot.id,
            metadata       : snapshot.metadata,
            size           : snapshot.size,
            url            : snapshot.url
          }));

          assert.deepEqual(cleanSnapshots, [{
            contentSettings: { contentType: 'text/plain' },
            id             : firstSnapshot,
            metadata       : { version: '2' },
            size           : 13,
            url            : `https://${ process.env.AZURE_STORAGE_ACCOUNT }.blob.core.windows.net/${ process.env.TEST_CONTAINER }/${ FILENAME }?snapshot=${ encodeURIComponent(firstSnapshot) }`
          }, {
            contentSettings: { contentType: 'text/html' },
            id             : undefined,
            metadata       : { version: '3' },
            size           : 6,
            url            : `https://${ process.env.AZURE_STORAGE_ACCOUNT }.blob.core.windows.net/${ process.env.TEST_CONTAINER }/${ FILENAME }`
          }]);
        });
      });
    });
  });
});
