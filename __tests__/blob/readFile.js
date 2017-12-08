'use strict'

const assert = require('assert');

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
    let content;

    beforeEach(async () => {
      content = await fs.promise.readFile(FILENAME);
    });

    test('should be of type Buffer', () => {
      assert(content instanceof Buffer);
    });

    test('should return the content of the file', () => {
      assert.equal(content.toString(), 'Hello, World!');
    });
  });
});
