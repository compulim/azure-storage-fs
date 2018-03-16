'use strict';

const AzureBlobFS = require('./AzureBlobFS');

module.exports = {
  blob: (account, secret, container) => new AzureBlobFS(account, secret, container)
};
