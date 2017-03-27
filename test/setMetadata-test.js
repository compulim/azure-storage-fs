'use strict';

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const { promise: fsPromise } = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
const helper = require('./testHelper')(fsPromise);

const FILENAME = 'metadata.txt';

describe('setMetadata', () => {
  beforeEach(async () => {
    await helper.ensureUnlinkIfExists(FILENAME);
    await helper.ensureWriteFile(FILENAME, 'TEST', { contentSettings: { contentType: 'text/plain' }, metadata: { hello: 'Aloha!' } });
  });

  afterEach(async () => {
    await helper.ensureUnlinkIfExists(FILENAME);
  });

  context('when reading metadata', () => {
    let stat;

    beforeEach(async () => stat = await fsPromise.stat(FILENAME, { metadata: true }));

    it('should return metadata', () => assert.deepEqual(stat.metadata, { hello: 'Aloha!' }));
  });

  context('when modifying metadata', () => {
    beforeEach(async () => await fsPromise.setMetadata(FILENAME, { hello: 'World!' }));

    context('then reading metadata', () => {
      let stat;

      beforeEach(async () => stat = await fsPromise.stat(FILENAME, { metadata: true }));

      it('should return new metadata', () => assert.deepEqual(stat.metadata, { hello: 'World!' }));
    });
  });
});
