const fs = require('fs').promises;
const log = require('mk-log');
const path = require('path');
const mkdirp = require('mkdirp');
//const { spawn } = require('child_process');
const gracefulStat = require('mk-graceful-stat');
const convert = require('./lib/utils/convert');
const deconstructBase64 = require('mk-deconstruct-base64');
const imageSize = require('image-size');
const mime = require('mime-types');

function argsForConvert(filePath, resize) {
  return [
    '-sampling-factor',
    '4:2:0',
    '-quality',
    '80',
    '-resize',
    resize,
    '-strip',
    '-write',
    filePath 
  ];
}

async function ensureDir(dir) {
  try {
    if (! await gracefulStat(dir)) {
      await mkdirp(dir); 
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      log.info(`dir not : ${err.path}`); 
    } else {
      log.error(err);
    }
  }
}


module.exports = async function MkImageConverter(assetsBaseDir, optionArgs) {

  let assetsDir;

  const options = {
    subPath: null
  };

  if (optionArgs) {
    for (let key in optionArgs) {
      options[key] = optionArgs[key];
    }
  }

  if (options.subPath) {
    assetsDir = path.join(assetsBaseDir, options.subPath); 
  } else {
    assetsDir = assetsBaseDir;
  }

  await ensureDir(assetsDir);
  const originalDir = path.join(assetsDir, 'original'); 
  await ensureDir(originalDir);

  return {

    async saveOriginalBase64(fileName, base64URI) {
      
      try { 
        
        const { data, mimeType, extension } = deconstructBase64(base64URI);
        // if the fileName has no extension
        // take extension from base64 uri
        let finalFileName = fileName; 
        if (fileName.indexOf('.') === -1) { 
          finalFileName = `${fileName}.${extension}`;
        }
        const filePath = path.join(originalDir, finalFileName);
        await fs.writeFile(filePath, data, 'base64');
        
        const stat = await gracefulStat(filePath);

        return Promise.resolve({
          stat,
          mimeType
        });

      } catch (err) {
    
        log.error(err);
        return Promise.reject(err);
      }
    },
    async saveOriginalBinary(fileName, binaryData) {

      try {
        
        const filePath = path.join(originalDir, fileName);
        await fs.writeFile(filePath, binaryData, 'binary');

        const mimeType = mime.lookup(fileName); 

        const stat = await gracefulStat(filePath);
        return Promise.resolve({
          stat,
          mimeType
        });         
      } catch (err) {
       
        log.error(err);
        return Promise.reject(err);
      }
    },
    async convert(originalFileName, items) {
      
      const originalFilePath = path.join(originalDir, originalFileName);
      const originalSplitted = originalFileName.split(/\./);
      const originalBaseFileName = originalSplitted[0];
      const originalExtension = originalSplitted[1];

      const imageMagickArgs = [originalFilePath];
      
      const convertedFiles = [];
      for (let i = 0, l = items.length; i < l; i++) {
      
        const item = items[i];
        const size = item.size;
        const type = item.type;
        const ext = item.ext || originalExtension;
        const itemDir = path.join(assetsDir, type);
        const fileName = `${originalBaseFileName}.${ext}`;
        await ensureDir(itemDir);
        const filePath = path.join(itemDir, fileName);
        convertedFiles.push({
          type,
          path: filePath
        });
        imageMagickArgs.push(argsForConvert(filePath, size)); 
      }
     
      const conversionStart = Date.now();

      await convert(imageMagickArgs.flat());
      const conversionEnd = Date.now();
    
      const conversionDuration = conversionEnd - conversionStart;

      log.debug('conversion duration in ms:', conversionDuration);

      for (let i = 0, l = convertedFiles.length; i < l; i++) {
        const convertedFile = convertedFiles[i];
        const path = convertedFile.path;
        const dimensions = imageSize(path);
        convertedFiles[i].w = dimensions.width;
        convertedFiles[i].h = dimensions.height;
      }
      
      return convertedFiles;

    }
  };

};

