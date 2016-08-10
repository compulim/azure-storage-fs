'use strict';

const assert = require('assert');
const Promise = require('bluebird');

const { toCallback } = require('../lib/promisifyhelper');

describe('promisifyhelper', () => {
  let asyncFn;

  context('wrap a promise function using toCallback()', () => {
    asyncFn = toCallback(function (hello) {
      assert.equal(hello, 'Hello!');

      return Promise.resolve('Aloha!');
    });

    let result;

    context('call the promise-style function', () => {
      return new Promise((resolve, reject) => {
        asyncFn('Hello!', (err, r) => {
          if (err) {
            reject(err);
          } else {
            result = r;
            resolve();
          }
        });
      });
    });

    it('should return successful result', () => {
      assert.equal(result, 'Aloha!');
    });
  });

  context('wrap a rejecting promise function using toCallback()', () => {
    asyncFn = toCallback(function () {
      return Promise.reject(new Error('rejected'));
    });

    let err;

    context('call the promise-style function', () => {
      return new Promise((resolve, reject) => {
        asyncFn(e => {
          err = e;
          resolve();
        });
      });
    });

    it('should return rejection', () => {
      assert(err instanceof Error);
      assert.equal(err.message, 'rejected');
    });
  });
});