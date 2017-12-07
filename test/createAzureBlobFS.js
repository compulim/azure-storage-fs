'use strict';

require('dotenv').config();

const AzureBlobFS = require('../lib/AzureBlobFS');
const azureStorage = require('azure-storage');

module.exports = async () => {
  return new Promise((resolve, reject) => {
    const blobService = azureStorage.createBlobService(process.env.AZURE_STORAGE_ACCOUNT, process.env.AZURE_STORAGE_ACCESS_KEY);

    blobService.createContainerIfNotExists(process.env.TEST_CONTAINER, err => {
      if (err) {
        reject(err);
      } else {
        resolve(new AzureBlobFS(
          process.env.AZURE_STORAGE_ACCOUNT,
          process.env.AZURE_STORAGE_ACCESS_KEY,
          process.env.TEST_CONTAINER
        ));
      }
    });
  });
}
