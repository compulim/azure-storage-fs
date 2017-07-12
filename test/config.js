'use strict';

const fs = require('fs');
const path = require('path');

module.exports =
  fs
    .readFileSync(path.join(__dirname, '../.env.local'), 'ucs2')
    .split(/(\r\n|\n)/)
    .reduce((json, line) => {
      const [key, ...value] = line.split('=');

      if (key.trim()) {
        json[key] = value.join('=');
      }

      return json;
    }, {});

console.log(module.exports);
