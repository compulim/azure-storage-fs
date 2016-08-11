'use strict';

const
  debug = require('debug')('AzureBlobFS'),
  doWhilst = require('./util/doWhilst'),
  path = require('path'),
  Promise = require('bluebird'),
  readAll = require('./util/readAll'),
  whilst = require('./util/whilst'),
  { R_OK, W_OK, X_OK } = require('fs'),
  { promisifyObject, toCallback } = require('./util/promisifyhelper');

const
  DEFAULT_OPTIONS = {
    blobDelimiter: '/',
    renameCheckInterval: 500
  },
  DEFAULT_CREATE_READ_STREAM_OPTIONS = { flags: 'r', encoding: null, fd: null, mode: 0o666, autoClose: true },
  DEFAULT_CREATE_WRITE_STREAM_OPTIONS = { flags: 'w', defaultEncoding: 'utf8', fd: null, mode: 0o666, autoClose: true },
  DEFAULT_READ_FILE_OPTIONS = { encoding: null, flag: 'r' },
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
  return path.normalize(pathname).replace(/\\/g, '/').replace(/^\//, '');
}

class AzureBlobFS {
  constructor(account, secret, container, options = DEFAULT_OPTIONS) {
    this.options = options;

    this._blobService = require('azure-storage').createBlobService(account, secret);
    this._blobServicePromised = promisifyObject(
      this._blobService,
      [
        'createBlockBlobFromText',
        'deleteBlob',
        'deleteBlobIfExists',
        'doesBlobExist',
        'getBlobProperties',
        'getContainerMetadata',
        'getContainerProperties',
        'listBlobDirectoriesSegmentedWithPrefix',
        'listBlobsSegmentedWithPrefix',
        'startCopyBlob'
      ]
    );

    this.container = container;

    [
      'mkdir',
      'open',
      'readdir',
      'readFile',
      'rename',
      'rmdir',
      'stat',
      'unlink',
      'writeFile'
    ].forEach(name => {
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

    pathname = normalizePath(pathname || options.fd.pathname);

    return this._blobService.createReadStream(this.container, pathname);
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

    pathname = normalizePath(pathname || options.fd.pathname);

    return this._blobService.createWriteStreamToBlockBlob(this.container, pathname);
  }

  mkdir(pathname) {
    debug(`mkdir(${ JSON.stringify(pathname) })`);

    pathname = normalizePath(pathname);
    pathname = pathname && (pathname + this.options.blobDelimiter);

    return this._blobServicePromised.createBlockBlobFromText(this.container, pathname + '$$$.$$$', '');
  }

  open(pathname, flags = 'r', mode) {
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
          return { pathname, flags };
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
        flags: options.flag
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
        () => this._blobServicePromised.deleteBlobIfExists(this.container, oldPathname),
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

    return this._blobServicePromised.deleteBlobIfExists(this.container, pathname + this.options.blobDelimiter + '$$$.$$$');
  }

  stat(pathname) {
    debug(`stat(${ JSON.stringify(pathname) })`);

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
    debug(`unlink(${ JSON.stringify(pathname) })`);

    pathname = normalizePath(pathname);

    return this._blobServicePromised.deleteBlob(this.container, pathname);
  }

  writeFile(pathname, data, options = DEFAULT_WRITE_FILE_OPTIONS) {
    options = Object.assign({}, DEFAULT_WRITE_FILE_OPTIONS, options);

    debug(`writeFile(${ JSON.stringify(pathname) }, <${ data.length } bytes>)`);

    pathname = normalizePath(pathname);

    return new Promise((resolve, reject) => {
      const writeStream = this.createWriteStream(pathname, {
        defaultEncoding: options.encoding,
        flags: options.flag,
        mode: options.mode,
      });

      writeStream
        .on('error', err => reject(err))
        .on('finish', () => resolve())
        .end(data);
    });
  }
}

module.exports = AzureBlobFS;
