'use strict';

const
  chopBuffer = require('./chopBuffer'),
  constants = require('./constants'),
  doWhilst = require('./promisedowhilst'),
  path = require('path'),
  Promise = require('bluebird'),
  uuid = require('node-uuid'),
  { R_OK, W_OK, X_OK } = require('fs'),
  { nodeifyObject, promisifyObject, toCallback } = require('./promisifyhelper');

const
  DEFAULT_OPTIONS = {
    blobDelimiter: '/',
    blockBlobSize: 4 * 1024 * 1024
  },
  IS_DIRECTORY = () => true,
  IS_FILE = () => false;

function normalizePath(pathname) {
  return path.normalize(pathname).replace(/\\/g, '/').replace(/^\//, '');
}

class AzureBlobFS {
  constructor(account, secret, container, options = DEFAULT_OPTIONS) {
    this.options = options;

    this._blobService = require('azure-storage').createBlobService(account, secret);
    this._blobServicePromised = promisifyObject(
      this._blobService,
      [
        'commitBlocks',
        'createBlockBlobFromText',
        'createBlockFromText',
        'deleteBlobIfExists',
        'getBlobProperties',
        'getContainerMetadata',
        'getContainerProperties',
        'listBlobDirectoriesSegmentedWithPrefix',
        'listBlobsSegmentedWithPrefix'
      ]
    );

    this.container = container;

    [
      'mkdir',
      'open',
      'readdir',
      'rmdir',
      'stat',
      'unlink',
      'writeFile'
    ].forEach(name => {
      this[name] = toCallback(this[name], { context: this });
    });
  }

  createReadStream(_, options) {
    const pathname = normalizePath(options.fd.pathname);

    return this._blobService.createReadStream(this.container, pathname);
  }

  mkdir(pathname) {
    pathname = normalizePath(pathname);
    pathname = pathname && (pathname + this.options.blobDelimiter);

    return this._blobServicePromised.createBlockBlobFromText(this.container, pathname + '$$$.$$$', '');
  }

  open(pathname, flags, mode = 0) {
    pathname = normalizePath(pathname);

    return this._blobServicePromised.getBlobProperties(this.container, pathname)
      .then(result => {
        return { pathname };
      });
  };

  readdir(pathname) {
    pathname = normalizePath(pathname);
    pathname = pathname && (pathname + this.options.blobDelimiter);

    let continuationToken;

    const options = { delimiter: this.options.blobDelimiter };
    const filenames = {};

    return Promise.map(
      [
        this._blobServicePromised.listBlobDirectoriesSegmentedWithPrefix,
        this._blobServicePromised.listBlobsSegmentedWithPrefix
      ],
      fn => {
        let continuationToken;

        return doWhilst(
          () => fn(this.container, pathname, continuationToken, options).then(result => {
            continuationToken = result.continuationToken;

            result.entries.forEach(entry => {
              const { name } = entry;

              if (name.startsWith(pathname) && !name.endsWith('$$$.$$$')) {
                const segments = name.substr(pathname.length).split(this.options.blobDelimiter);

                filenames[segments[0]] = 0;
              }
            });
          }),
          () => continuationToken
        );
      }
    ).then(() => {
      return Object.keys(filenames).sort();
    });
  }

  rmdir(pathname) {
    pathname = normalizePath(pathname);

    let continuationToken;

    return (
      doWhilst(
        () => {
          this._blobServicePromised.listBlobsSegmentedWithPrefix(
            this.container,
            pathname + this.options.blobDelimiter,
            continuationToken,
            {}
          )
          .then(result => {
            continuationToken = result.continuationToken;

            return Promise.map(
              result.entries,
              entry => this._blobServicePromised.deleteBlobIfExists(this.container, entry.name)
            );
          })
        },
        () => continuationToken
      )
    );
  }

  stat(pathname) {
    pathname = normalizePath(pathname);

    if (pathname) {
      return this._blobServicePromised.getBlobProperties(this.container, pathname)
        .then(result => {
          return Promise.resolve({
            isDirectory: IS_FILE,
            mode: R_OK | W_OK,
            mtime: new Date(result.lastModified),
            size: result.contentLength,
          });
        }, err => {
          if (err.statusCode !== 404) {
            return Promise.reject(err);
          }

          return this._blobServicePromised.listBlobDirectoriesSegmentedWithPrefix(this.container, pathname, null, { maxResults: 1 })
            .then(result => {
              if (result.entries.length && result.entries[0].name === pathname + this.options.blobDelimiter) {
                return Promise.resolve({
                  isDirectory: IS_DIRECTORY,
                  mode: R_OK | W_OK | X_OK,
                  mtime: new Date(0),
                  size: 0
                });
              } else {
                return Promise.reject(new Error('not found'));
              }
            });
        });
    } else {
      return this._blobServicePromised.getContainerProperties(this.container)
        .then(result => {
          return Promise.resolve({
            isDirectory: IS_DIRECTORY,
            mode: R_OK | W_OK | X_OK,
            mtime: new Date(result.lastModified),
            size: 0
          });
        });
    }
  }

  unlink(pathname) {
    pathname = normalizePath(pathname);

    return this._blobServicePromised.deleteBlobIfExists(this.container, pathname);
  }

  writeFile(pathname, buffer) {
    pathname = normalizePath(pathname);

    const blocks = chopBuffer(buffer, this.options.blockBlobSize);

    return (
      Promise.mapSeries(
        blocks,
        block => {
          const blockIDBuffer = new Buffer(16);

          uuid.v4(null, blockIDBuffer, 0);

          const blockID = blockIDBuffer.toString('base64');

          return this._blobServicePromised.createBlockFromText(
            blockID,
            this.container,
            pathname,
            block,
            {}
          ).then(() => blockID);
        }
      )
      .then(blockList =>
        this._blobServicePromised.commitBlocks(this.container, pathname, { LatestBlocks: blockList }, {})
      )
    );
  }
}

module.exports = AzureBlobFS;
