'use strict';

const assert = require('assert');

const FILENAME = 'metadata.txt';

describe('setMetadata', () => {
  let fs, helper;

  beforeEach(async () => {
    fs     = await require('../../testUtils/createAzureBlobFS')();
    helper = require('../../testUtils/testHelper')(fs.promise);

    await helper.ensureUnlinkIfExists(FILENAME);
    await helper.ensureWriteFile(FILENAME, 'TEST', { contentSettings: { contentType: 'text/plain' }, metadata: { hello: 'Aloha!' } });
  });

  afterEach(async () => {
    await helper.ensureUnlinkIfExists(FILENAME);
  });

  describe('when reading metadata', () => {
    let stat;

    beforeEach(async () => stat = await fs.promise.stat(FILENAME, { metadata: true }));

    test('should return metadata', () => assert.deepEqual(stat.metadata, { hello: 'Aloha!' }));
  });

  describe('when modifying metadata', () => {
    beforeEach(async () => await fs.promise.setMetadata(FILENAME, { hello: 'World!' }));

    describe('then reading metadata', () => {
      let stat;

      beforeEach(async () => stat = await fs.promise.stat(FILENAME, { metadata: true }));

      test('should return new metadata', () => assert.deepEqual(stat.metadata, { hello: 'World!' }));
    });
  });
});
