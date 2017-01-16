'use strict';

const assert = require('assert');
const AzureBlobFS = require('../lib/AzureBlobFS');
const { env } = process;
const fs = new AzureBlobFS(env.BLOB_ACCOUNT_NAME, env.BLOB_SECRET, env.BLOB_CONTAINER);
const fsPromise = fs.promise;
const TEST_FILENAME = 'metadata.txt';

describe('metadata', () => {
  beforeEach(async () => await fsPromise.writeFile(TEST_FILENAME, 'TEST', { contentSettings: { contentType: 'text/plain' }, metadata: { hello: 'Aloha!' } }));
  afterEach(async () => await fsPromise.unlink(TEST_FILENAME));

  context('when reading metadata', () => {
    let stat;

    beforeEach(async () => stat = await fsPromise.stat(TEST_FILENAME, { metadata: true }));

    it('should return metadata', () => assert.deepEqual(stat.metadata, { hello: 'Aloha!' }));
  });

  context('when modifying metadata', () => {
    beforeEach(async () => await fsPromise.metadata(TEST_FILENAME, { hello: 'World!' }));

    context('then reading metadata', () => {
      let stat;

      beforeEach(async () => stat = await fsPromise.stat(TEST_FILENAME, { metadata: true }));

      it('should return new metadata', () => assert.deepEqual(stat.metadata, { hello: 'World!' }));
    });
  });
});
