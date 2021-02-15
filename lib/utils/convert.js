const log = require('mk-log');
const { spawn } = require('child_process');

module.exports = function convert(imageMagickArgs) {

  return new Promise((resolve, reject) => {

    try {
      
      const child = spawn('/usr/local/bin/convert', imageMagickArgs);
      child.on('error', (err) => {
        log.error(err);
        return reject(err);
      });
      child.on('exit', () => {
        log.debug('exit'); 
        return resolve();
      });
      child.on('message', (message) => {
        log.debug('message', message);
        // message 
      });
      child.on('close', (code) => {
        log.debug('close with code: ', code);
        return resolve();
      });
    } catch (err) {
      log.error(err);
      return reject(err);
    }
  });
};
