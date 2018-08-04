'use strict';

let debug = () => 0;

try {
  debug = require('debug')('AzureBlobFS');
} catch (err) {}

const { BlobUtilities } = require('azure-storage');
const path = require('path');

const readAll = require('./util/readAll');
const sleep = require('./util/sleep');
const { R_OK, W_OK, X_OK } = require('fs');
const S_IFREG = 32768;
const S_IFDIR = 16384;
const { promisifyObject, toCallback } = require('./util/promisifyHelper');

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
  ERR_NOT_EMPTY = new Error('not empty'),
  ERR_NOT_FOUND = new Error('no such file or directory'),
  ERR_NOT_IMPLEMENTED = new Error('function not implemented'),
  ERR_UNKNOWN = new Error('unknown error');

ERR_ABORT.code = 'EINTR';
ERR_EXIST.code = 'EEXIST';
ERR_NOT_EMPTY.code = 'ENOTEMPTY';
ERR_NOT_FOUND.code = 'ENOENT';
ERR_NOT_IMPLEMENTED.code = 'ENOSYS';
ERR_UNKNOWN.code = 'UNKNOWN';

function normalizePath(pathname) {
  return pathname && path.normalize(pathname).replace(/\\/g, '/').replace(/^\//, '');
}

const REQUIRED_BLOB_SERVICE_APIS = [
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
];

class AzureBlobFS {
  constructor(account, secret, container, options = DEFAULT_OPTIONS) {
    if (account && REQUIRED_BLOB_SERVICE_APIS.every(name => typeof account[name] === 'function')) {
      // If account looks like a BlobService (with all of our required APIs), then use it
      this._blobService = account;
      container = secret;
      options = container;
    } else {
      this._blobService = require('azure-storage').createBlobService(account, secret);
    }

    this.options = options;

    this._blobServicePromised = promisifyObject(
      this._blobService,
      REQUIRED_BLOB_SERVICE_APIS
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

  async mkdir(pathname) {
    debug(`mkdir(${ JSON.stringify(pathname) })`);

    pathname = normalizePath(pathname);
    pathname = pathname && (pathname + this.options.blobDelimiter);
    pathname += '$$$.$$$';

    const { entries } = await this._blobServicePromised.listBlobsSegmentedWithPrefix(this.container, pathname, null, { maxResults: 1 });

    if (entries.length) {
      return Promise.reject(ERR_EXIST);
    } else {
      return this._blobServicePromised.createBlockBlobFromText(this.container, pathname, '');
    }
  }

  async open(pathname, flags = 'r', mode, options = {}) {
    debug(`open(${ JSON.stringify(pathname) }, ${ JSON.stringify(flags) }, ${ JSON.stringify(mode) })`);

    pathname = normalizePath(pathname);

    if (
      flags !== 'r'
      && flags !== 'w'
      && flags !== 'wx'
    ) {
      throw new Error('only flag "r", "w", and "wx" are supported');
    }

    const { exists } = this._blobServicePromised.doesBlobExist(this.container, pathname)

    if (~flags.indexOf('x')) {
      if (exists) {
        return Promise.reject(ERR_EXIST);
      }
    } else if (!exists) {
      return Promise.reject(ERR_NOT_FOUND);
    }

    await this._blobServicePromised.getBlobProperties(this.container, pathname);

    return {
      flags,
      pathname,
      snapshot: options.snapshot
    };
  }

  async readdir(pathname) {
    debug(`readdir(${ JSON.stringify(pathname) })`);

    pathname = normalizePath(pathname);
    pathname = pathname && (pathname + this.options.blobDelimiter);

    const results = await Promise.all([
      this._blobServicePromised.listBlobDirectoriesSegmentedWithPrefix,
      this._blobServicePromised.listBlobsSegmentedWithPrefix
    ].map(async fn => {
      const options = { delimiter: this.options.blobDelimiter };
      const filenames = {};
      let continuationToken;

      do {
        const result = await fn(this.container, pathname, continuationToken, options);

        continuationToken = result.continuationToken;

        result.entries.forEach(entry => {
          const { name } = entry;

          if (name.startsWith(pathname) && !name.endsWith('$$$.$$$')) {
            const segments = name.substr(pathname.length).split(this.options.blobDelimiter);

            filenames[segments[0]] = 0;
          }
        });
      } while (continuationToken)

      return Object.keys(filenames).sort();
    }));

    return [].concat.apply([], results);
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

  async rename(oldPathname, newPathname) {
    debug(`rename(${ JSON.stringify(oldPathname) }, ${ JSON.stringify(newPathname) })`);

    oldPathname = normalizePath(oldPathname);
    newPathname = normalizePath(newPathname);

    const oldURI = this._blobService.getUrl(this.container, oldPathname);

    if ((await this._blobServicePromised.doesBlobExist(this.container, newPathname)).exists) {
      return Promise.reject(ERR_EXIST);
    }

    let copyStatus;

    try {
      copyStatus = (await this._blobServicePromised.startCopyBlob(oldURI, this.container, newPathname, {})).copy.status
    } catch (err) {
      return Promise.reject(err.statusCode === 404 ? ERR_NOT_FOUND : err);
    }

    try {
      while (copyStatus !== 'success') {
        switch (copyStatus) {
        case 'failed':
          return Promise.reject(ERR_UNKNOWN);

        case 'aborted':
          return Promise.reject(ERR_ABORT);

        case 'pending':
          await sleep(this.options.renameCheckInterval);
          copyStatus = (await this._blobServicePromised.getBlobProperties(this.container, newPathname)).copy.status;
        }
      }

      this._blobServicePromised.deleteBlobIfExists(
        this.container,
        oldPathname,
        {
          deleteSnapshots: BlobUtilities.SnapshotDeleteOptions.BLOB_AND_SNAPSHOTS
        }
      );
    } catch (err) {
      try {
        await this._blobServicePromised.deleteBlobIfExists(this.container, newPathname);
      } catch (err) {
      }

      return Promise.reject(err);
    }
  }

  async rmdir(pathname) {
    debug(`rmdir(${ JSON.stringify(pathname) })`);

    pathname = normalizePath(pathname);

    await this._blobServicePromised.deleteBlobIfExists(this.container, pathname + this.options.blobDelimiter + '$$$.$$$');

    const { entries } = await this._blobServicePromised.listBlobsSegmentedWithPrefix(
      this.container,
      pathname,
      null,
      {
        maxResults: 1
      }
    );

    if (entries.length) {
      return Promise.reject(ERR_NOT_EMPTY);
    }
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

  async _getSnapshots(pathname, options) {
    const snapshots = [];
    let continuationToken;

    do {
      if (options.snapshot === true) {
        const result = await this._blobServicePromised.listBlobsSegmentedWithPrefix(
          this.container,
          pathname,
          continuationToken,
          {
            include: `${ (options.metadata || '') && 'metadata,' }snapshots`
          }
        );

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
      }
    } while (continuationToken)

    return snapshots;
  }

  async stat(pathname, options = { metadata: false, snapshot: false }) {
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

      try {
        const [properties, metadata, snapshots] = await Promise.all([
          this._blobServicePromised.getBlobProperties(this.container, pathname, getOptions),
          options.metadata ? (await this._blobServicePromised.getBlobMetadata(this.container, pathname, getOptions)).metadata : null,
          this._getSnapshots(pathname, options)
        ]);

        const stat = {
          contentSettings: properties.contentSettings,
          isDirectory    : IS_FILE,
          metadata,
          mode           : R_OK | W_OK | S_IFREG,
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
      } catch (err) {
        if (err.statusCode !== 404) {
          return Promise.reject(err);
        }

        const { entries } = await this._blobServicePromised.listBlobDirectoriesSegmentedWithPrefix(this.container, pathname, null, { maxResults: 1 });

        if (entries.length && entries[0].name === pathname + this.options.blobDelimiter) {
          return {
            isDirectory: IS_DIRECTORY,
            mode: R_OK | W_OK | X_OK | S_IFDIR,
            mtime: new Date(0),
            size: 0
          };
        } else {
          return Promise.reject(ERR_NOT_FOUND);
        }
      }
    } else {
      const { lastModified } = await this._blobServicePromised.getContainerProperties(this.container);

      return {
        isDirectory: IS_DIRECTORY,
        mode: R_OK | W_OK | X_OK | S_IFDIR,
        mtime: new Date(lastModified),
        size: 0
      };
    }
  }

  async unlink(pathname, options = { snapshot: true }) {
    debug(`unlink(${ JSON.stringify(pathname) }, ${ JSON.stringify(options) })`);

    pathname = normalizePath(pathname);

    let deleteOptions = {};

    if (options.snapshot === true) {
      deleteOptions.deleteSnapshots = BlobUtilities.SnapshotDeleteOptions.BLOB_AND_SNAPSHOTS;
    } else if (typeof options.snapshot === 'string') {
      deleteOptions.deleteSnapshots = options.snapshot;
    }

    try {
      await this._blobServicePromised.deleteBlob(
        this.container,
        pathname,
        deleteOptions
      );
    } catch (err) {
      return Promise.reject(err.statusCode === 404 ? ERR_NOT_FOUND : err);
    }
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
