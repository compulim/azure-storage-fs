'use strict'

require('dotenv').config();

const retry  = require('promise-retry');
const stream = require('stream');

const FILENAME = 'snapshot.txt';

describe('snapshot', () => {
  let fs, helper;

  beforeEach(async () => {
    fs     = await require('../../testUtils/createAzureBlobFS')();
    helper = require('../../testUtils/testHelper')(fs.promise);

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

      test('should returns version equals to "1"', () => expect(stat.metadata).toEqual({ version: '1' }));
      test('should returns "Content-Type" as "text/plain"', () => expect(stat.contentSettings.contentType).toBe('text/plain'));
    });

    describe('when stat-ing the new snapshot', () => {
      let stat;

      beforeEach(async () => {
        stat = await retry(retry => fs.promise.stat(FILENAME, { metadata: true, snapshot: firstSnapshot }), { minTimeout: 100 });
      });

      test('should returns version equals to "2"', () => expect(stat.metadata).toEqual({ version: '2' }));
      test('should returns "Content-Type" as "text/plain"', () => expect(stat.contentSettings.contentType).toBe('text/plain'));
    });

    describe('overwrite the file with new content', () => {
      beforeEach(async () => {
        await fs.promise.writeFile(FILENAME, 'Aloha!', { contentSettings: { contentType: 'text/html' }, metadata: { version: '3' } });
        await helper.ensureStat(FILENAME, stat => stat.metadata.version === '3');
      });

      test('when reading the file with snapshot ID should return original content', async () => {
        const buffer = await fs.promise.readFile(FILENAME, { snapshot: firstSnapshot });

        expect(buffer.toString()).toBe('Hello, World!');
      });

      test('when reading the file without specifying snapshot ID should return the new content', async () => {
        const content = await fs.promise.readFile(FILENAME);

        expect(content.toString()).toBe('Aloha!');
      });

      describe('when stat-ing the file with snapshot ID', () => {
        let stat;

        beforeEach(async () => {
          stat = await fs.promise.stat(FILENAME, { metadata: true, snapshot: firstSnapshot });
        });

        test('should return version equals to "2"', () => expect(stat.metadata).toEqual({ version: '2' }));
        test('should returns "Content-Type" as "text/plain"', () => expect(stat.contentSettings.contentType).toBe('text/plain'));
      });

      describe('when stat-ing the file with all snapshots and metadata', () => {
        let stat;

        beforeEach(async () => {
          stat = await fs.promise.stat(FILENAME, { metadata: true, snapshot: true });
        });

        test('should return version equals to "3"', () => expect(stat.metadata).toEqual({ version: '3' }));
        test('should returns "Content-Type" as "text/html"', () => expect(stat.contentSettings.contentType).toBe('text/html'));

        test('should return two snapshots', () => {
          const cleanSnapshots = stat.snapshots.map(snapshot => ({
            contentSettings: { contentType: snapshot.contentSettings.contentType },
            id             : snapshot.id,
            metadata       : snapshot.metadata,
            size           : snapshot.size,
            url            : snapshot.url
          }));

          expect(cleanSnapshots).toEqual([{
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
