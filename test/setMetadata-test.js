'use strict';

const assert = require('assert');

const FILENAME = 'metadata.txt';

describe('setMetadata', () => {
  let fs, helper;

  before(async () => {
    fs     = await require('./createAzureBlobFS')();
    helper = require('./testHelper')(fs.promise);
  });

  beforeEach(async () => {
    await helper.ensureUnlinkIfExists(FILENAME);
    await helper.ensureWriteFile(FILENAME, 'TEST', { contentSettings: { contentType: 'text/plain' }, metadata: { hello: 'Aloha!' } });
  });

  afterEach(async () => {
    await helper.ensureUnlinkIfExists(FILENAME);
  });

  context('when reading metadata', () => {
    let stat;

    beforeEach(async () => stat = await fs.promise.stat(FILENAME, { metadata: true }));

    it('should return metadata', () => assert.deepEqual(stat.metadata, { hello: 'Aloha!' }));
  });

  context('when modifying metadata', () => {
    beforeEach(async () => await fs.promise.setMetadata(FILENAME, { hello: 'World!' }));

    context('then reading metadata', () => {
      let stat;

      beforeEach(async () => stat = await fs.promise.stat(FILENAME, { metadata: true }));

      it('should return new metadata', () => assert.deepEqual(stat.metadata, { hello: 'World!' }));
    });
  });
});
