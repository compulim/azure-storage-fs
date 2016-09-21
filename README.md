azure-storage-fs
================

A drop-in "fs" replacement for accessing Azure Storage with Node.js "fs" API.

This package is designed to support [ftpd](https://www.npmjs.com/package/ftpd).

## How to use

```js
const fs = require('azure-storage-fs').blob(accountName, secret, container);

fs.readFile('helloworld.txt', (err, data) => {
  console.log(err || data);
});
```

## Supported APIs

### Path normalization

Paths will be normalized with the following rules:

1. Turn backslashes (Windows style) into slashes, then
2. Remove leading slashes

For example, `\Users\Documents\HelloWorld.txt` will become `Users/Documents/HelloWorld.txt`.

### Blob service

Since Blob service is flat natively, it does not support directory tree. It use delimiter `/` to provides a hierarchical view of its flat structure. A hidden empty blob named `$$$.$$$` is used to represent empty directory.

Only block blob is supported and is the default blob type when creating a new blob.

* `createReadStream`
  * Only default options are supported
    * `encoding` is not supported
    * New `snapshot` options for specifying ID of the snapshot to read
* `createWriteStream`
  * Only default options are supported
    * Append is not supported
    * `encoding` is not supported
* `mkdir`
  * Will create a hidden blob under the new folder, named `$$$.$$$`
* `open`
  * Supported mode: `r`, `w`, and `wx`
  * Only default options are supported
    * New `snapshot` options for specifying ID of the snapshot to open
* `readdir`
* `readFile`
  * Implemented using `createReadStream`
  * Only default options are supported
    * `encoding` is not supported
    * New `snapshot` options for specifying ID of the snapshot to read
* `rename`
  * Implemented as copy-and-delete
  * (WIP) Need to check if snapshot can be supported
* `rmdir`
  * Will delete hidden blob `$$$.$$$` if exists
* `snapshot(filename, newSnapshotID = undefined)`
  * (WIP) Will create a new snapshot based on existing blob
  * Will return the new snapshot ID
* `stat(pathname, options)`
  * Only report the following properties
    * `isDirectory()`
    * `mode` always equals to `R_OK | W_OK`
    * `mtime`
    * `size`
      * `0` for directory
    * New `url` for the actual URL (not support Shared Access Signature yet)
  * Options can be passed as the second argument
    * `snapshot` (default set to `false`)
      * When set to `true`, the call will also return an array named `snapshots`, each with the following properties
        * `id` is the snapshot ID
        * `mtime`
        * `size`
        * `url`
      * When set to a string, the call will target the specified snapshot ID
      * Otherwise, will target the default (i.e. most recent) blob
* `unlink(pathname, options)`
  * Options can be passed as the second argument
    * `snapshot` (default set to `true`)
      * `true` will delete all snapshots associated with the blob
      * Otherwise, it will be treated as a string to specify the ID of the snapshot to delete
* `writeFile`
  * Implemented using `createWriteStream`
  * Only default options are supported
    * Append is not supported
    * `encoding` is not supported

#### Snapshot

Snapshot is supported and snapshot ID can be specified for most read APIs. `stat` can also set to return snapshot information. By default this is disabled to save transaction cost.

### File service

In future, we plan to support Azure Storage File, which is another file storage service accessible thru HTTP interface and SMB on Azure.

## Integration with ftpd

[`ftpd`](https://www.npmjs.com/package/ftpd) supports custom "fs" implementation and `azure-storage-fs` is designed to be a "fs" provider for `ftpd`.

To use a custom "fs" implementation, in your `ftpd` authorization code (`command:pass` event), add `require('azure-storage-fs').blob(accountName, secret, container)` to the `success` callback. For example,

```js
connection.on('command:pass', (password, success, failure) => {
  if (auth(username, password)) {
    success(username, require('azure-storage-fs').blob(accountName, secret, container));
  } else {
    failure();
  }
});
```

## Some ideas for ftpd

* Different users store their files on different Blob container
* Username/password can be stored as container metadata
* Trigger webhook when a file is uploaded to FTP

## Some caveats for ftpd

* Azure Storage is eventually consistent, changes may not happen right away
  * After uploaded a file, it may not appear in the file list immediately
* When listing files, `ftpd` will call `fs.readdir()` first, then `fs.stat()` for every file
  * Listing a folder with 10 files will result in 11 requests to Azure
  * Calling `fs.stat()` on a directory will result in 2 calls to Azure

## Changelog

0.0.4 (2016-08-11)
---

* `rmdir` now only delete hidden blob `$$$.$$$`, instead of delete blobs recursively
* `unlink` now fail if the blob does not exist
* Add [examples](examples)

0.0.3 (2016-08-11)
---

* Support all APIs required by [ftpd](https://www.npmjs.com/package/ftpd)

0.0.1 (2016-08-11)
---

* Pre-release
