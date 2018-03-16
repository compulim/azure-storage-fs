'use strict';

const FILENAME = 'readFile.txt';

describe('readFile', () => {
  let fs, helper;

  beforeEach(async () => {
    fs     = await require('../../testUtils/createAzureBlobFS')();
    helper = require('../../testUtils/testHelper')(fs.promise);

    await helper.ensureUnlinkIfExists(FILENAME);
    await helper.ensureWriteFile(FILENAME, 'Hello, World!');
  });

  afterEach(async () => {
    await helper.ensureUnlinkIfExists(FILENAME);
  });

  describe('read a text file', () => {
    let buffer;

    beforeEach(async () => {
      buffer = await fs.promise.readFile(FILENAME);
    });

    test('should be of type Buffer', () => {
      expect(buffer).toBeInstanceOf(Buffer);
    });

    test('should return the content of the file', () => {
      expect(buffer.toString()).toBe('Hello, World!');
    });
  });
});
