'use strict'

const assert = require('assert');

const FILENAME = 'readFile.txt';

describe('readFile', () => {
  let fs, helper;

  before(async () => {
    fs     = await require('./createAzureBlobFS')();
    helper = require('./testHelper')(fs.promise);
  });

  beforeEach(async () => {
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

    it('should be of type Buffer', () => {
      assert(content instanceof Buffer);
    });

    it('should return the content of the file', () => {
      assert.equal(content.toString(), 'Hello, World!');
    });
  });
});
