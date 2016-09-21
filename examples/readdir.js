'use strict';

const fs = require('../index').blob(
  process.env.BLOB_ACCOUNT_NAME,
  process.env.BLOB_SECRET,
  process.env.BLOB_CONTAINER
);

fs.readdir('filebucket', (err, data) => {
  if (err) { return console.error('failed'); }

  console.log(data.toString());
});
