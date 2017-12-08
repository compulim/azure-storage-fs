function sleep(duration) {
  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
}

module.exports = sleep;
