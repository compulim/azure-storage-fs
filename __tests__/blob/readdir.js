'use strict';

const DIR_NAME = 'readdir';

const FILES = {
  '1.txt': 'Eiusmod adipisicing officia laborum consequat veniam ullamco.',
  '2.txt': 'Qui pariatur ad mollit commodo reprehenderit officia aliquip reprehenderit ex sunt exercitation.'
};

describe('readdir', () => {
  let fs, helper;

  beforeEach(async () => {
    fs     = await require('../../testUtils/createAzureBlobFS')();
    helper = require('../../testUtils/testHelper')(fs.promise);

    await Promise.all(Object.keys(FILES).map(file => helper.ensureUnlinkIfExists(`${ DIR_NAME }/${ file }`)));
    await Promise.all(Object.keys(FILES).map(file => helper.ensureWriteFile(`${ DIR_NAME }/${ file }`, FILES[file])));
  });

  afterEach(async () => {
    await Promise.all(Object.keys(FILES).map(file => helper.ensureUnlinkIfExists(`${ DIR_NAME }/${ file }`)));
  });

  test('read a dir should list files', () => {
    return expect(fs.promise.readdir(DIR_NAME)).resolves.toEqual(Object.keys(FILES));
  });
});
