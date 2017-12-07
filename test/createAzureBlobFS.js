'use strict';

require('dotenv').config();

const AzureBlobFS = require('../lib/AzureBlobFS');

module.exports = new AzureBlobFS(
  process.env.AZURE_STORAGE_ACCOUNT,
  process.env.AZURE_STORAGE_ACCESS_KEY,
  process.env.TEST_CONTAINER
);
