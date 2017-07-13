'use strict';

const assert                                = require('assert');
const qs                                    = require('qs');
const { AccountSasConstants }               = require('azure-storage').Constants;

const parseSASToken = require('../lib/util/parseSASToken');

const { Permissions, Protocols, Resources }                = AccountSasConstants;
const { parsePermissions, parseResources, parseProtocols } = parseSASToken;

describe('Parse SAS token', () => {
  context('parse protocols', () => {
    it('should parse "https" as HTTPSONLY', () => {
      assert.equal(parseProtocols('https'), Protocols.HTTPSONLY);
    });

    it('should parse "http" as HTTPSORHTTP', () => {
      assert.equal(parseProtocols('http'), Protocols.HTTPSORHTTP);
    });

    it('should parse "http,https" as HTTPSORHTTP', () => {
      assert.equal(parseProtocols('http,https'), Protocols.HTTPSORHTTP);
    });

    it('should parse "https,http" as HTTPSORHTTP', () => {
      assert.equal(parseProtocols('https,http'), Protocols.HTTPSORHTTP);
    });
  });

  context('parse resources', () => {
    it('should parse "b" as OBJECT', () => {
      assert.equal(parseResources('b'), Resources.OBJECT);
    });

    it('should parse "c" as CONTAINER', () => {
      assert.equal(parseResources('c'), Resources.CONTAINER);
    });
  });

  context('parse permissions', () => {
    it('should parse "r" as READ', () => {
      assert.equal(parsePermissions('r'), Permissions.READ);
    });

    it('should parse "a" as ADD', () => {
      assert.equal(parsePermissions('a'), Permissions.ADD);
    });

    it('should parse "c" as CREATE', () => {
      assert.equal(parsePermissions('c'), Permissions.CREATE);
    });

    it('should parse "w" as WRITE', () => {
      assert.equal(parsePermissions('w'), Permissions.WRITE);
    });

    it('should parse "d" as DELETE', () => {
      assert.equal(parsePermissions('d'), Permissions.DELETE);
    });

    it('should parse "l" as LIST', () => {
      assert.equal(parsePermissions('l'), Permissions.LIST);
    });

    it('should parse "u" as UPDATE', () => {
      assert.equal(parsePermissions('u'), Permissions.UPDATE);
    });

    it('should parse "p" as PROCESS', () => {
      assert.equal(parsePermissions('p'), Permissions.PROCESS);
    });

    it('should parse "rw" as PROCESS', () => {
      assert.equal(parsePermissions('rw'), `${ Permissions.READ }${ Permissions.WRITE }`);
    });
  });

  context('parse query', () => {
    it('should parse full token', () => {
      const actual = parseSASToken('?' + qs.stringify({
        se: '2099-12-31T23:59:59.999Z',
        st: '2000-01-01T00:00:00.000Z',
        sip: '192.168.0.1',
        sp: 'craw',
        spr: 'http,https',
        sr: 'b'
      }));

      const expected = {
        AccessPolicy: {
          Expiry: new Date(Date.UTC(2099, 11, 31, 23, 59, 59, 999)),
          Start : new Date(Date.UTC(2000, 0, 1)),
          IPAddressOrRange: '192.168.0.1',
          Protocols: Protocols.HTTPSORHTTP,
          Permissions: [
            Permissions.CREATE,
            Permissions.READ,
            Permissions.ADD,
            Permissions.WRITE
          ].join(''),
          ResourceTypes: Resources.OBJECT
        }
      };

      assert.deepEqual(
        actual,
        expected
      );
    });

    it('should parse token without protocol', () => {
      assert.deepEqual(
        parseSASToken('?' + qs.stringify({
          se: '2099-12-31T23:59:59.999Z',
          st: '2000-01-01T00:00:00.000Z',
          sip: '192.168.0.1',
          sp: 'craw',
          sr: 'b'
        })),
        {
          AccessPolicy: {
            Expiry: new Date(Date.UTC(2099, 11, 31, 23, 59, 59, 999)),
            Start : new Date(Date.UTC(2000, 0, 1)),
            IPAddressOrRange: '192.168.0.1',
            Protocols: null,
            Permissions: [
              Permissions.CREATE,
              Permissions.READ,
              Permissions.ADD,
              Permissions.WRITE
            ].join(''),
            ResourceTypes: Resources.OBJECT
          }
        }
      );
    });

    it('should parse token without start/expiry', () => {
      assert.deepEqual(
        parseSASToken('?' + qs.stringify({
          sip: '192.168.0.1',
          sp: 'craw',
          sr: 'b'
        })),
        {
          AccessPolicy: {
            Expiry: null,
            Start : null,
            IPAddressOrRange: '192.168.0.1',
            Protocols: null,
            Permissions: [
              Permissions.CREATE,
              Permissions.READ,
              Permissions.ADD,
              Permissions.WRITE
            ].join(''),
            ResourceTypes: Resources.OBJECT
          }
        }
      );
    });
  });
});
