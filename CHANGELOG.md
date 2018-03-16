# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Added [`CHANGELOG.md`](CHANGELOG.md)

### Changed
- All upcoming changes will available at `azure-storage-fs@master`
- Transpiled with Babel with ES6 and Stage 3

## [0.4.0] - 2017-12-07
### Added
- Bring your own `BlobService`

## [0.3.1] - 2017-12-06
### Fixed
- Fix not working on Linux due to file name capitalization

## [0.3.0] - 2017-01-16
### Added
- setMetadata: New API to set metadata on existing blob or snapshot

## [0.2.0] - 2017-01-13
### Added
- `createWriteStream`: Add `contentSettings` support
- `stat`: Add `contentSettings` support
- `writeFile`: Add `contentSettings` support

## [0.1.0] - 2017-01-12
### Added
- `createWriteStream`: Add `metadata` support
- `snapshot`: Add `metadata` support
- `stat`: Add `metadata` support
- `writeFile`: Add `metadata` support

## [0.0.6] - 2016-12-05
### Added
- sas: Added check on absence of required `expiry` option
- sas: Will default `flag` to `r` if not set
- Added more tests

### Fixed
- mkdir: Throw `EEXIST` when the directory already exists
- rmdir: Throw `ENOTEMPTY` when the directory still contains one or more blobs after deleting `$$$.$$$` placeholder

## [0.0.5] - 2016-09-28
### Added
- sas: Added `sas()` to create a blob SAS token synchronously
- snapshot: Added `snapshot()` to create a blob snapshot

## [0.0.4] - 2016-08-11
### Added
- Add [examples](examples)

### Changed
- `rmdir` now only delete hidden blob `$$$.$$$`, instead of delete blobs recursively
- `unlink` now fail if the blob does not exist

## [0.0.3] - 2016-08-11
### Added
- Support all APIs required by [ftpd](https://www.npmjs.com/package/ftpd)

## [0.0.1] - 2016-08-11
### Added
- Pre-release
