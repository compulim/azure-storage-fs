'use strict';

const FILENAME1 = 'rename1.txt';
const FILENAME2 = 'rename2.txt';
const FILENAME3 = 'rename3.txt';

describe('rename', () => {
  let fs, helper;

  beforeEach(async () => {
    fs     = await require('../../testUtils/createAzureBlobFS')();
    helper = require('../../testUtils/testHelper')(fs.promise);

    await Promise.all([FILENAME1, FILENAME2].map(file => helper.ensureUnlinkIfExists(file)));
    await helper.ensureWriteFile(FILENAME1, 'Hello, World!');
  });

  afterEach(async () => {
    await Promise.all([FILENAME1, FILENAME2].map(file => helper.ensureUnlinkIfExists(file)));
  });

  test('rename a file', async () => {
    await fs.promise.rename(FILENAME1, FILENAME2);
    await Promise.all([
      helper.ensureNotExists(FILENAME1),
      helper.ensureExists(FILENAME2)
    ]);

    const buffer = await fs.promise.readFile(FILENAME2);

    expect(buffer.toString()).toBe('Hello, World!');
  });

  test('rename a non-exist file', async () => {
    return expect(fs.promise.rename(FILENAME2, FILENAME3)).rejects.toHaveProperty('code', 'ENOENT');
  });

  test('rename to an existing file', async () => {
    await helper.ensureWriteFile(FILENAME2, 'Hello, World!');

    return expect(fs.promise.rename(FILENAME1, FILENAME2)).rejects.toHaveProperty('code', 'EEXIST');
  });
});
