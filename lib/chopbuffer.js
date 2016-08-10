'use strict';

function chopBuffer(buffer, blockSize) {
  const blocks = [];
  const length = buffer.length;
  let offset = 0;

  while (offset < length) {
    const size = Math.min(blockSize, length - offset);

    blocks.push(buffer.slice(offset, offset + size));
    offset += blockSize;
  }

  return blocks;
}

module.exports = chopBuffer;
