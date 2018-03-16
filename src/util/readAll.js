'use strict';

function readAll(stream) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let numBytes = 0;

    stream
      .on('data', chunk => {
        chunks.push(chunk);
        numBytes += chunk.length;
      })
      .on('error', err => reject(err))
      .on('end', () => {
        resolve(Buffer.concat(chunks, numBytes));
        chunks = null;
      });
  });
}

module.exports = readAll;
