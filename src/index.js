'use strict';

const {
  AzureBlobFS, normalizePath, DEFAULT_WRITE_FILE_OPTIONS,
  DEFAULT_READ_FILE_OPTIONS, DEFAULT_OPTIONS
} = require('./AzureBlobFS');

module.exports = {
  blob: (account, secret, container) => new AzureBlobFS(account, secret, container),
  normalizePath: normalizePath,
  DEFAULT_WRITE_FILE_OPTIONS: DEFAULT_WRITE_FILE_OPTIONS,
  DEFAULT_READ_FILE_OPTIONS: DEFAULT_READ_FILE_OPTIONS,
  DEFAULT_OPTIONS: DEFAULT_OPTIONS
};