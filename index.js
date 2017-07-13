'use strict';

const AzureBlobFS = require('./lib/AzureBlobFS');

module.exports = {
  blob: (account, secretOrSAS, container, options) => new AzureBlobFS(account, secretOrSAS, container, options)
};
