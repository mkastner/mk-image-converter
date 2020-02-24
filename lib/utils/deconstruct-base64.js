const mime = require('mime-types');
//const log = require('mk-log');

module.exports = function deconstructBase64(base64) {

  const splitted = base64.split(';base64,'); 
 
  const meta = splitted[0];
  const data = splitted[1]; 

  const mimeType = meta.split(/:/)[1];
  const extension = mime.extension(mimeType);

  return {
    mimeType,
    extension: extension === 'jpeg' ? 'jpg' : extension,
    data
  };
};
