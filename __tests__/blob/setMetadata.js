'use strict';

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

  test('when reading metadata should return metadata', async () => {
    const { metadata } = await fs.promise.stat(FILENAME, { metadata: true });

    expect(metadata).toEqual({ hello: 'Aloha!' });
  });

  test('when modifying metadata then reading metadata should return new metadata', async () => {
    await fs.promise.setMetadata(FILENAME, { hello: 'World!' });

    const { metadata } = await fs.promise.stat(FILENAME, { metadata: true });

    expect(metadata).toEqual({ hello: 'World!' });
  });
});
