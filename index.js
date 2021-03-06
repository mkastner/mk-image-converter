const fs = require('fs').promises;
const log = require('mk-log');
const path = require('path');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const glob = require('glob');
const gracefulStat = require('mk-graceful-stat');
const convert = require('./lib/utils/convert');
const deconstructBase64 = require('mk-deconstruct-base64');
const imageSize = require('image-size');
const mime = require('mime-types');

function argsForConvert(filePath, resize) {
  return [
    '\(', 
    '+clone',
    '-resize',
    resize,
    '-quality',
    '80',
    '-write', 
    filePath, 
    '+delete',
    '\)' 
  ];
}

function globPromise(pattern, options) {
  return new Promise( (resolve, reject) => {
    glob(pattern, options, (err, files) => {
      if (err) {
        return reject(err);
      }
      return resolve(files);
    }); 
  });
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

  const options = Object.assign({}, {
    tempPath: 'tmp' 
  }, optionArgs);


  if (!options.tempPath) {
    throw new Error('tempDir must be a sub path of assetsDir');
  }  

  const tempDir = path.join(assetsBaseDir, options.tempPath);
  await ensureDir(assetsBaseDir);
  await ensureDir(tempDir);

  return {

    async tempFileExists(fileName) {
      
      try { 
     
        const tempFilePath = path.join(tempDir, fileName);
        return await gracefulStat(tempFilePath);
      } catch (err) {
        
        log.error(err);
        return Promise.reject(err);
      }
    }, 
    
    async saveTempBase64(fileName, base64URI) {
      
      try { 
        
        const { data, mimeType, extension } = deconstructBase64(base64URI);
        // if the fileName has no extension
        // take extension from base64 uri
        let finalFileName = fileName; 
        if (fileName.indexOf('.') === -1) { 
          finalFileName = `${fileName}.${extension}`;
        }
        const tempFilePath = path.join(tempDir, finalFileName);
        await fs.writeFile(tempFilePath, data, 'base64');
        
        const stat = await gracefulStat(tempFilePath);

        return Promise.resolve({
          stat,
          mimeType
        });
      } catch (err) {
    
        log.error(err);
        return Promise.reject(err);
      }
    },

    async saveTempBinary(fileName, binaryData) {

      try {
        
        const filePath = path.join(tempDir, fileName);
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

    async remove(options) {

      if (!options || (!options.subPath && !options.fileName)) {
        throw new Error('options must be provided either with key for subPath or key for fileName'); 
      }

      const { subPath, fileName, fileTypes } = options; 

      if (subPath) {
        const assetsDir = path.join(assetsBaseDir, subPath); 

        return new Promise((resolve, reject) => {
          rimraf(assetsDir, (err) => {
            if (err) { 
              log.error(err);
              return reject(err);
            }
            resolve();
          });
        });

      }

      const extName = path.extname(fileName); 
      const baseFileName = fileName.replace(extName, '');  
      const allFileTypes = fileTypes.concat('original');

      for (let i = 0, l = allFileTypes.length; i < l; i++) {
        const fileType = allFileTypes[i];
        const globPattern = path.join(assetsBaseDir, fileType, `${baseFileName}.*`);  
        const globbedFiles = await globPromise(globPattern);
        for (let i = 0, l = globbedFiles.length; i < l; i++) {
          const globbedFile = globbedFiles[i];
          await fs.unlink(globbedFile); 
        }
      }
    },

    async convert(originalFileName, items, options) {

      let assetsDir = null;

      if (options && options.subPath) {
        assetsDir = path.join(assetsBaseDir, options.subPath); 
      } else {
        assetsDir = assetsBaseDir;
      }
      
      const originalDir = path.join(assetsDir, 'original'); 
      await ensureDir(originalDir);

      const tempFilePath = path.join(tempDir, originalFileName); 
      const originalFilePath = path.join(originalDir, originalFileName);
      
      await fs.rename(tempFilePath, originalFilePath);

      const originalSplitted = originalFileName.split(/\./);
      const originalBaseFileName = originalSplitted[0];
      const originalExtension = originalSplitted[1];

      const imageMagickArgs = [
        originalFilePath,
        '-strip',
        '-alpha',
        'remove'
      ];
      
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

      const flattedArgs = imageMagickArgs.flat()
      log.debug('flattedArgs', flattedArgs);
      await convert(flattedArgs);
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

      let originalDimensions = {
        width: 0,
        height: 0
      };

      if (!(originalFilePath || '').match(/\.pdf$/)) {
        try {
          originalDimensions = imageSize(originalFilePath); 
        } catch (e) {
          log.warn('could not read dimensions for', originalFilePath);
        }
      } else {
        log.info('Skipping reading dimensions for pdf');
      }
      
      const allFiles = convertedFiles.concat({
        w: originalDimensions.width,
        h: originalDimensions.height,
        path: originalFilePath,
        type: 'original'
      });


      allFiles.sort((a, b) => {
        return a.w - b.w;
      });

      log.debug(allFiles);

      return allFiles;

    }
  };

};

