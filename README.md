azure-storage-fs
================

A drop-in \"fs\" replacement for accessing Azure Storage with Node.js \"fs\" API.

This package is designed to support [ftpd](https://www.npmjs.com/package/ftpd).

Supported APIs
==============

Blob
----

* `createReadStream`
* `createWriteStream`
* `mkdir`
* `open`
* `readdir`
* `readFile`
* `rename`
* `rmdir`
* `stat`
* `unlink`
* `writeFile`

Changelog
=========

0.0.3 (2016-08-11)
---

* Support all APIs required by [ftpd](https://www.npmjs.com/package/ftpd)

0.0.1 (2016-08-11)
---

* Pre-release
