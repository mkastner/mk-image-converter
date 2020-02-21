const fs = require('fs').promises;
const log = require('mk-log');

module.exports = async function gracefulStat(path, showMessage) {
  try {
    return await fs.stat(path); 
  } catch (err) {
    if (err.code === 'ENOENT') {
      if (showMessage) {
        log.info(`dir not : ${err.path}`); 
      }
      return Promise.resolve();
    } else {
      log.error(err);
      return Promise.reject(err);
    }
  }
};
