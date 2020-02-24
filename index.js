const fs = require('fs').promises;
const log = require('mk-log');
const path = require('path');
const mkdirp = require('mkdirp');
//const { spawn } = require('child_process');
const gracefulStat = require('mk-graceful-stat');
const convert = require('./lib/utils/convert');
const deconstructBase64 = require('./lib/utils/deconstruct-base64');

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


module.exports = async function MkAssets(assetsBaseDir, optionArgs) {

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

    async saveOriginalBase64(baseFileName, base64URI) {
      
      try { 
        
        const { data, extension } = deconstructBase64(base64URI);
        const fileName = `${baseFileName}.${extension}`;
        const filePath = path.join(originalDir, fileName);
        await fs.writeFile(filePath, data, 'base64');
      } catch (err) {
    
        log.error(err);
      }
    },
    async saveOriginalBinary(fileName, binaryData) {

      try {
        
        const filePath = path.join(originalDir, fileName);
        await fs.writeFile(filePath, binaryData, 'binary');
      } catch (err) {
       
        log.error(err);
      }
    },
    async convert(originalFile, items) {
      
      const originalFilePath = path.join(originalDir, originalFile);
      const originalSplitted = originalFile.split(/\./);
      const originalBaseFileName = originalSplitted[0];
      const originalExtension = originalSplitted[1];

      const imageMagickArgs = [originalFilePath];
      for (let i = 0, l = items.length; i < l; i++) {
      
        const item = items[i];
        const size = item.size;
        const type = item.type;
        const ext = item.ext || originalExtension;
        const itemDir = path.join(assetsDir, type);
        const fileName = `${originalBaseFileName}.${ext}`;
        await ensureDir(itemDir);
        const filePath = path.join(itemDir, fileName);
        imageMagickArgs.push(argsForConvert(filePath, size)); 
      }
      await convert(imageMagickArgs.flat());       
      //const child = spawn('convert', imageMagickArgs.flat());
    }
  };

};

