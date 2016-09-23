'use strict';

const fs = require('../index').blob(
  process.env.BLOB_ACCOUNT_NAME,
  process.env.BLOB_SECRET,
  process.env.BLOB_CONTAINER
);

fs.readFile('snapshot/hello.txt', { snapshot: '2016-09-23T04:39:04.9822174Z' }, (err, data) => {
  if (err) { return console.error('failed'); }

  console.log(data.toString());
});
