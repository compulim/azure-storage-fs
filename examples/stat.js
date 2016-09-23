'use strict';

const fs = require('../index').blob(
  process.env.BLOB_ACCOUNT_NAME,
  process.env.BLOB_SECRET,
  process.env.BLOB_CONTAINER
);

fs.stat('snapshot/hello.txt', { snapshot: true }, (err, stat) => {
  if (err) { return console.error('failed'); }

  console.log(stat);
});
