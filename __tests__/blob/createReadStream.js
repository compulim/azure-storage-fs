'use strict'

const FILENAME = 'createReadStream.txt';

describe('createReadStream', () => {
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

  test('should return the content of the file', async () => {
    const readStream = fs.createReadStream(FILENAME);
    const content = await readAll(readStream);

    expect(content.toString()).toBe('Hello, World!');
  });
});

function readAll(stream) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    let numBytes = 0;

    stream
      .on('data', data => {
        buffers.push(data);
        numBytes += data.length;
      })
      .on('end', () => {
        resolve(Buffer.concat(buffers, numBytes));
      })
      .on('error', err => {
        reject(err)
      })
      .resume();
  });
}