'use strict';

let debug = () => 0;

try {
  debug = require('debug')('AzureBlobFS');
} catch (err) {}

const doWhilst = require('./util/doWhilst');
const path = require('path');
const Promise = require('bluebird');
const readAll = require('./util/readAll');
const whilst = require('./util/whilst');
const { R_OK, W_OK, X_OK } = require('fs');
const { promisifyObject, toCallback } = require('./util/promisifyhelper');

const
  DEFAULT_OPTIONS = {
    blobDelimiter: '/',
    renameCheckInterval: 500
  },
  DEFAULT_SAS_OPTIONS = { flag: 'r' },
  DEFAULT_CREATE_READ_STREAM_OPTIONS = { flags: 'r', encoding: null, fd: null, mode: 0o666, autoClose: true },
  DEFAULT_CREATE_WRITE_STREAM_OPTIONS = { flags: 'w', defaultEncoding: 'utf8', fd: null, mode: 0o666, autoClose: true },
  DEFAULT_METADATA_OPTIONS = {},
  DEFAULT_READ_FILE_OPTIONS = { encoding: null, flag: 'r' },
  DEFAULT_SNAPSHOT_OPTIONS = {},
  DEFAULT_WRITE_FILE_OPTIONS = { encoding: 'utf8', mode: 0o666, flag: 'w' },
  IS_DIRECTORY = () => true,
  IS_FILE = () => false;

const
  ERR_ABORT = new Error('interrupted system call'),
  ERR_EXIST = new Error('file already exists'),
  ERR_NOT_FOUND = new Error('no such file or directory'),
  ERR_NOT_IMPLEMENTED = new Error('function not implemented'),
  ERR_UNKNOWN = new Error('unknown error');

ERR_ABORT.code = 'EINTR';
ERR_EXIST.code = 'EEXIST';
ERR_NOT_FOUND.code = 'ENOENT';
ERR_NOT_IMPLEMENTED.code = 'ENOSYS';
ERR_UNKNOWN.code = 'UNKNOWN';

const
  { BlobUtilities } = require('azure-storage');

function normalizePath(pathname) {
  return pathname && path.normalize(pathname).replace(/\\/g, '/').replace(/^\//, '');
}

class AzureBlobFS {
  constructor(account, secret, container, options = DEFAULT_OPTIONS) {
    this.options = options;

    this._blobService = require('azure-storage').createBlobService(account, secret);
    this._blobServicePromised = promisifyObject(
      this._blobService,
      [
        'createBlobSnapshot',
        'createBlockBlobFromText',
        'deleteBlob',
        'deleteBlobIfExists',
        'doesBlobExist',
        'getBlobMetadata',
        'getBlobProperties',
        'getContainerMetadata',
        'getContainerProperties',
        'listBlobDirectoriesSegmentedWithPrefix',
        'listBlobsSegmentedWithPrefix',
        'setBlobMetadata',
        'startCopyBlob'
      ]
    );

    this.container = container;
    this.promise = {};

    [
      'mkdir',
      'open',
      'readdir',
      'readFile',
      'rename',
      'rmdir',
      'setMetadata',
      'snapshot',
      'stat',
      'unlink',
      'writeFile'
    ].forEach(name => {
      this.promise[name] = this[name].bind(this);
      this[name] = toCallback(this[name], { context: this });
    });
  }

  createReadStream(pathname, options = DEFAULT_CREATE_READ_STREAM_OPTIONS) {
    debug(`createReadStream(${ JSON.stringify(pathname) }, ${ JSON.stringify(options) })`);

    options = Object.assign({}, DEFAULT_CREATE_READ_STREAM_OPTIONS, options);

    if (
      options.flags[0] !== 'r'
      || options.encoding
      || !options.autoClose
    ) {
      throw ERR_NOT_IMPLEMENTED;
    }

    if (options.fd) {
      pathname = normalizePath(options.fd.pathname);
    } else {
      pathname = normalizePath(pathname);
    }

    // TODO: Review "open" and "close" event emitted by blobService.createReadStream
    //       to see if they match the behavior of Node.js
    //       https://nodejs.org/api/fs.html#fs_event_open

    return this._blobService.createReadStream(
      this.container,
      pathname,
      {
        snapshotId: options.fd ? options.fd.snapshot : options.snapshot
      }
    );
  }

  createWriteStream(pathname, options = DEFAULT_CREATE_WRITE_STREAM_OPTIONS) {
    debug(`createWriteStream(${ JSON.stringify(pathname) }, ${ JSON.stringify(options) })`);

    options = Object.assign({}, DEFAULT_CREATE_WRITE_STREAM_OPTIONS, options);

    if (
      (options.flags !== 'w' && options.flags !== 'wx')
      || options.defaultEncoding !== 'utf8'
      || !options.autoClose
    ) {
      throw ERR_NOT_IMPLEMENTED;
    }

    if (options.fd) {
      pathname = normalizePath(options.fd.pathname);
    } else {
      pathname = normalizePath(pathname);
    }

    return this._blobService.createWriteStreamToBlockBlob(
      this.container,
      pathname,
      {
        contentSettings: options.contentSettings,
        metadata       : options.metadata
      }
    );
  }

  mkdir(pathname) {
    debug(`mkdir(${ JSON.stringify(pathname) })`);

    pathname = normalizePath(pathname);
    pathname = pathname && (pathname + this.options.blobDelimiter);
    pathname += '$$$.$$$';

    return this._blobServicePromised.listBlobsSegmentedWithPrefix(this.container, pathname, null, { maxResults: 1 })
      .then(result => {
        if (result.entries.length) {
          const err = new Error('already exist');

          err.code = 'EEXIST';

          return Promise.reject(err);
        } else {
          return this._blobServicePromised.createBlockBlobFromText(this.container, pathname, '');
        }
      });
  }

  open(pathname, flags = 'r', mode, options = {}) {
    debug(`open(${ JSON.stringify(pathname) }, ${ JSON.stringify(flags) }, ${ JSON.stringify(mode) })`);

    pathname = normalizePath(pathname);

    if (
      flags !== 'r'
      && flags !== 'w'
      && flags !== 'wx'
    ) {
      throw new Error('only flag "r", "w", and "wx" are supported');
    }

    return (
      this._blobServicePromised.doesBlobExist(this.container, pathname)
        .then(result => {
          if (~flags.indexOf('x')) {
            if (result.exists) {
              return Promise.reject(ERR_EXIST);
            }
          } else if (!result.exists) {
            return Promise.reject(ERR_NOT_FOUND);
          }

          return this._blobServicePromised.getBlobProperties(this.container, pathname);
        })
        .then(result => {
          return { pathname, flags, snapshot: options.snapshot };
        })
    );
  }

  readdir(pathname) {
    debug(`readdir(${ JSON.stringify(pathname) })`);

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

  readFile(pathname, options = DEFAULT_READ_FILE_OPTIONS) {
    options = Object.assign({}, DEFAULT_READ_FILE_OPTIONS, options);

    debug(`readFile(${ JSON.stringify(pathname) }, ${ JSON.stringify(options) })`);

    pathname = normalizePath(pathname);

    if (options.flag !== 'r') {
      throw new Error('only flag "r" is supported');
    }

    const readStream = this.createReadStream(
      pathname,
      {
        encoding: options.encoding,
        flags: options.flag,
        snapshot: options.snapshot
      }
    );

    return readAll(readStream);
  }

  rename(oldPathname, newPathname) {
    debug(`rename(${ JSON.stringify(oldPathname) }, ${ JSON.stringify(newPathname) })`);

    oldPathname = normalizePath(oldPathname);
    newPathname = normalizePath(newPathname);

    const oldURI = this._blobService.getUrl(this.container, oldPathname);

    return (
      this._blobServicePromised.startCopyBlob(
        oldURI,
        this.container,
        newPathname,
        {}
      )
      .then(result => {
        let copyStatus = result.copy.status;

        return whilst(
          () => {
            switch (copyStatus) {
            case 'failed':
              return Promise.reject(ERR_UNKNOWN);

            case 'aborted':
              return Promise.reject(ERR_ABORT);

            case 'pending':
              return Promise.resolve(1).delay(this.options.renameCheckInterval);
            }
          },
          () => {
            return this._blobServicePromised.getBlobProperties(this.container, newPathname)
              .then(result => {
                copyStatus = result.copy.status;
              })
          }
        );
      })
      .then(
        () => this._blobServicePromised.deleteBlobIfExists(
          this.container,
          oldPathname,
          {
            deleteSnapshots: BlobUtilities.SnapshotDeleteOptions.BLOB_AND_SNAPSHOTS
          }
        ),
        err => {
          return this._blobServicePromised.deleteBlobIfExists(this.container, newPathname)
            .catch(() => 0)
            .then(() => Promise.reject(err));
        }
      )
    );
  }

  rmdir(pathname) {
    debug(`rmdir(${ JSON.stringify(pathname) })`);

    pathname = normalizePath(pathname);

    return this._blobServicePromised.deleteBlobIfExists(this.container, pathname + this.options.blobDelimiter + '$$$.$$$')
      .then(() =>
        this._blobServicePromised.listBlobsSegmentedWithPrefix(
          this.container,
          pathname,
          null,
          {
            maxResults: 1
          }
        )
      )
      .then(result => {
        if (result.entries.length) {
          const err = new Error('not empty');

          err.code = 'ENOTEMPTY';

          return Promise.reject(err);
        }
      });
  }

  sas(pathname, options = DEFAULT_SAS_OPTIONS) {
    options = Object.assign(DEFAULT_SAS_OPTIONS, options);

    if (typeof options.expiry !== 'number' && !(options.expiry instanceof Date)) {
      throw new Error('expiry must be set to a number or Date');
    }

    debug(`sas(${ JSON.stringify(pathname) }, ${ JSON.stringify(options) })`);

    pathname = normalizePath(pathname);

    return this._blobService.generateSharedAccessSignature(
      this.container,
      pathname,
      {
        AccessPolicy: {
          Expiry: options.expiry,
          Permissions: options.flag,
          Start: options.start
        }
      }
    );
  }

  setMetadata(pathname, metadata, options = DEFAULT_METADATA_OPTIONS) {
    debug(`setMetadata(${ pathname }, ${ JSON.stringify(metadata) })`);

    const apiOptions = {
      snapshotId: options.snapshot
    };

    return this._blobServicePromised.setBlobMetadata(this.container, pathname, metadata, apiOptions);
  }

  snapshot(pathname, options = DEFAULT_SNAPSHOT_OPTIONS) {
    debug(`snapshot(${ JSON.stringify(pathname) })`);

    pathname = normalizePath(pathname);

    return this._blobServicePromised.createBlobSnapshot(
      this.container,
      pathname,
      {
        metadata: options.metadata
      }
    );
  }

  stat(pathname, options = { metadata: false, snapshot: false }) {
    debug(`stat(${ JSON.stringify(pathname) })`);

    pathname = normalizePath(pathname);

    if (pathname) {
      const getOptions = {};

      if (typeof options.snapshot === 'string') {
        getOptions.snapshotId = options.snapshot;
      }

      if (options.metadata !== true) {
        delete options.metadata;
      }

      return (
        Promise.all([
          this._blobServicePromised.getBlobProperties(this.container, pathname, getOptions),
          options.metadata ?
            this._blobServicePromised.getBlobMetadata(this.container, pathname, getOptions).then(result => result.metadata)
          :
            Promise.resolve(),
          Promise.resolve().then(() => {
            const snapshots = [];
            let continuationToken;

            return (
              doWhilst(
                () => {
                  if (options.snapshot === true) {
                    return (
                      this._blobServicePromised.listBlobsSegmentedWithPrefix(
                        this.container,
                        pathname,
                        continuationToken,
                        {
                          include: `${ (options.metadata || '') && 'metadata,' }snapshots`
                        }
                      ).then(result => {
                        result.entries.forEach(entry => {
                          entry.name === pathname && snapshots.push({
                            contentSettings: entry.contentSettings,
                            id             : entry.snapshot,
                            metadata       : entry.metadata,
                            mtime          : new Date(entry.lastModified),
                            size           : +entry.contentLength,
                            url            : this._blobService.getUrl(this.container, pathname, null, null, entry.snapshot)
                          });
                        });

                        continuationToken = result.continuationToken;
                      })
                    );
                  }
                },
                () => continuationToken
              ).then(() => snapshots)
            );
          })
        ]).then(
          results => {
            const [properties, metadata, snapshots] = results;
            const stat = {
              contentSettings: properties.contentSettings,
              isDirectory    : IS_FILE,
              metadata,
              mode           : R_OK | W_OK,
              mtime          : new Date(properties.lastModified),
              size           : +properties.contentLength,
              url            : this._blobService.getUrl(this.container, pathname)
            };

            if (options.snapshot === true) {
              Object.assign(stat, {
                snapshots: snapshots.sort((x, y) => {
                  x = x && x.mtime;
                  y = y && y.mtime;

                  return x > y ? 1 : x < y ? -1 : 0;
                })
              });
            }

            return stat;
          }, err => {
            if (err.statusCode !== 404) {
              return Promise.reject(err);
            }

            return (
              this._blobServicePromised.listBlobDirectoriesSegmentedWithPrefix(this.container, pathname, null, { maxResults: 1 })
                .then(result => {
                  if (result.entries.length && result.entries[0].name === pathname + this.options.blobDelimiter) {
                    return Promise.resolve({
                      isDirectory: IS_DIRECTORY,
                      mode: R_OK | W_OK | X_OK,
                      mtime: new Date(0),
                      size: 0
                    });
                  } else {
                    const err = new Error('not found');

                    err.code = 'ENOENT';

                    return Promise.reject(err);
                  }
                })
            );
          }
        )
      );
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

  unlink(pathname, options = { snapshot: true }) {
    debug(`unlink(${ JSON.stringify(pathname) }, ${ JSON.stringify(options) })`);

    pathname = normalizePath(pathname);

    let deleteOptions = {};

    if (options.snapshot === true) {
      deleteOptions.deleteSnapshots = BlobUtilities.SnapshotDeleteOptions.BLOB_AND_SNAPSHOTS;
    } else if (typeof options.snapshot === 'string') {
      deleteOptions.deleteSnapshots = options.snapshot;
    }

    return this._blobServicePromised.deleteBlob(
      this.container,
      pathname,
      deleteOptions
    ).catch(err => {
      if (err.statusCode === 404) {
        err = new Error();
        err.code = 'ENOENT';
      }

      throw err;
    });
  }

  writeFile(pathname, data, options = DEFAULT_WRITE_FILE_OPTIONS) {
    options = Object.assign({}, DEFAULT_WRITE_FILE_OPTIONS, options);

    debug(`writeFile(${ JSON.stringify(pathname) }, <${ data.length } bytes>)`);

    pathname = normalizePath(pathname);

    return new Promise((resolve, reject) => {
      const writeStream = this.createWriteStream(pathname, {
        contentSettings: options.contentSettings,
        defaultEncoding: options.encoding,
        flags          : options.flag,
        metadata       : options.metadata,
        mode           : options.mode
      });

      writeStream
        .on('error', err => reject(err))
        // HACK: When metadata is causing error, writeStream will still emit "finish" before "error", we add "setImmediate" to mitigate the issue
        .on('finish', () => setImmediate(resolve))
        .end(data);
    });
  }
}

module.exports = AzureBlobFS;
