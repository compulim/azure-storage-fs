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

### Blob Service

* `createReadStream`
  * Only default options are supported
    * `encoding` is not supported
* `createWriteStream`
  * Only default options are supported
    * Append is not supported
    * `encoding` is not supported
* `mkdir`
  * Will create a hidden blob under the new folder, named `$$$.$$$`
* `open`
  * Supported mode: `r`, `w`, and `wx`
  * Only default options are supported
* `readdir`
* `readFile`
  * Implemented using `createReadStream`
  * Only default options are supported
    * `encoding` is not supported
* `rename`
  * Implemented as copy-and-delete
* `rmdir`
  * Will delete hidden blob `$$$.$$$` if exists
* `stat`
  * Only support the followings:
    * `isDirectory()`
    * `mode` always equals to `R_OK | W_OK`
    * `mtime`
    * `size`
      * `0` for directory
* `unlink`
* `writeFile`
  * Implemented using `createWriteStream`
  * Only default options are supported
    * Append is not supported
    * `encoding` is not supported

### File Service

In future, we will support Azure Storage File, which is another file storage service accessible thru HTTP interface and SMB on Azure.

## Integration with ftpd

[`ftpd`](https://www.npmjs.com/package/ftpd) supports custom "fs" implementation and `azure-storage-fs` is designed to be a "fs" provider for `ftpd`.

To use a custom "fs" implementation, in your `ftpd` authorization code (`command:pass` event), add `require(azure-storage-fs).blob(accountName, secret, container)` to the `success` callback. For example,

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

## Some caveats for ftpd

* Azure Storage is eventually consistent, changes may not happen right away
  * After uploaded a file, it may not appear in the file list immediately
* Azure Storage Blob does not support directory
  * For empty directory, we keep a hidden blob named `$$$.$$$`
* When listing files, `ftpd` will call `fs.readdir` first, then `fs.stat` for every file
  * Listing a folder with tons of file will result in lots of requests to Azure

## Changelog

0.0.4 (2016-08-11)
---

* `rmdir` now only delete hidden blob `$$$.$$$`, instead of delete blobs recursively
* `unlink` now fail if the blob does not exist
* Add [examples](tree/master/examples)

0.0.3 (2016-08-11)
---

* Support all APIs required by [ftpd](https://www.npmjs.com/package/ftpd)

0.0.1 (2016-08-11)
---

* Pre-release
