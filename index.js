'use strict';

const AzureBlobFS = require('./lib/AzureBlobFS');

module.exports = {
  blob: (account, secret, container) => new AzureBlobFS(account, secret, container)
};
