'use strict';

const fs = require('fs');
const path = require('path');

process.env = Object.assign(
  {},
  process.env,
  fs
    .readFileSync(path.join(__dirname, '../.env.local'), 'ucs2')
    .split(/(\r\n|\n)/)
    .reduce((json, line) => {
      const [key, ...value] = line.split('=');

      if (key.trim()) {
        json[key.trim()] = value.join('=');
      }

      return json;
    }, {})
);
