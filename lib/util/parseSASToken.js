'use strict';

const qs                                    = require('qs');
const { AccountSasConstants }               = require('azure-storage').Constants;
const { Permissions, Protocols, Resources } = AccountSasConstants;

function parseSASToken(sasToken) {
  sasToken = qs.parse((sasToken || '').replace(/^\?/, ''));

  return {
    AccessPolicy: {
      Expiry          : sasToken.se && new Date(sasToken.se),
      IPAddressOrRange: sasToken.sip,
      Permissions     : parsePermissions(sasToken.sp),
      Protocols       : parseProtocols(sasToken.spr),
      ResourceTypes   : parseResources(sasToken.sr),
      Start           : sasToken.st && new Date(sasToken.st)
    }
  };
}

function parseMap(str, mapping) {
  return str && str.split('').reduce((result, char) => {
    char = mapping[char];
    char && result.push(char);

    return result;
  }, []);
}

function parseResources(resourceString) {
  return parseMap(
    resourceString,
    {
      b: Resources.OBJECT,
      c: Resources.CONTAINER
    }
  )[0];
}

function parseProtocols(protocols) {
  return protocols && protocols.split(',').reduce((result, protocol) => {
    if (result !== Protocols.HTTPSORHTTP && protocol === 'http') {
      return Protocols.HTTPSORHTTP;
    } else {
      return result;
    }
  }, Protocols.HTTPSONLY);
}

function parsePermissions(permissionString) {
  return parseMap(
    permissionString,
    {
      a: Permissions.ADD,
      c: Permissions.CREATE,
      d: Permissions.DELETE,
      l: Permissions.LIST,
      p: Permissions.PROCESS,
      r: Permissions.READ,
      u: Permissions.UPDATE,
      w: Permissions.WRITE
    }
  ).join('');
}

parseSASToken.parsePermissions = parsePermissions;
parseSASToken.parseProtocols   = parseProtocols;
parseSASToken.parseResources   = parseResources;

module.exports = parseSASToken;
