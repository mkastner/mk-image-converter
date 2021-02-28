const tape = require('tape');
const deconstructBase64 = require('mk-deconstruct-base64');
const gracefulStat = require('mk-graceful-stat');
const fs = require('fs').promises;
const path = require('path');
const ImageConverter = require('../');
const log = require('mk-log');
const rimraf = require('rimraf');
const fileTypes = {
  png: 'image/png',
  jpg: 'image/jpeg',
  svg: 'image/svg+xml',
  pdf: 'application/pdf' 
};

async function clearTestResults() {
  
  const dir = path.join(__dirname, 'results');
  if (! await gracefulStat ) return false;

  return new Promise((resolve, reject) => {

    rimraf(dir, (err) => {
      
      if (err) return reject(err);
      resolve();
    });
  });
}

async function main() {


  try {
    await clearTestResults();
  }
  catch (err) {
    log.error(err);
  }

  tape('deconstruct', async (t) => {
    
    try {
      
      for (let key in fileTypes) {
        const base64Data = await fs.readFile(
          path.join(__dirname, 'assets',`example-${key}.base64`), 'utf8' );
        const deconstructedItem = deconstructBase64(base64Data);  
        const mimeType = deconstructedItem.mimeType;
        const extension = deconstructedItem.extension;
        const data = deconstructedItem.data;
        
        t.equal(mimeType, fileTypes[key], `mime type for ${key}: ${fileTypes[key]}`);
        t.equal(extension, key, `extension for ${key}`);
        t.ok(data, `data for ${key}`);

      }

    } catch (err) {
    
      log.error(err); 
    } finally {
      
      t.end();
    }
  });
  
  tape('save base64', async (t) => {
  
    try {
      for (let key in fileTypes) {
  
        const base64Data = await fs.readFile(
          path.join(__dirname, 'assets',`example-${key}.base64`), 'utf8' );
        
        const assets = await ImageConverter(path.join(__dirname, 'results'));
        const saveResult = await assets.saveTempBase64('base64-example', base64Data);  
      
        t.ok(saveResult.stat, 'returning stat object');
        t.equal(saveResult.mimeType, fileTypes[key], 
          `returning stat object for "${key}" with mime type ${fileTypes[key]}`);

        const statResult = await gracefulStat(
          path.join(__dirname, 'results', 'tmp', `base64-example.${key}`), true);

        t.ok(statResult, 'original base64 as ${key} file saved');
      }
    } catch (err) {
      log.error(err); 
    } finally {
      t.end();
    }
  });
  
  tape('save binary', async (t) => {
  
    try {

      for (let key in fileTypes) {


        const exampleFile = await fs.readFile(
          path.join(__dirname, 'assets',`example.${key}`) );
        
        const assets = await ImageConverter(path.join(__dirname, 'results'));
        const saveResult = await assets.saveTempBinary(`example.${key}`, exampleFile);  
        t.ok(saveResult.stat, `returning stat object for ${key}`);
        t.equal(saveResult.mimeType, fileTypes[key], `returning mime type ${key[fileTypes]} for ${key}`);
        
        const statResult = await gracefulStat(
          path.join(__dirname, 'results', 'tmp', `example.${key}`), true);
        
        t.ok(statResult, `original file type "${key}" saved`);
        
        const assetsWithId = await ImageConverter(path.join(__dirname, 'results'));
        const result = await assetsWithId.saveTempBinary(`example.${key}`, exampleFile);  
        t.ok(result.stat, `returning stat object for file type ${key}`);
        
        const statResultWithId = await gracefulStat(
          path.join(__dirname, 'results', 'tmp', `example.${key}`), true);
        
        t.ok(statResultWithId, `original file saved with subPath for file type ${key}`);
      }
    } catch (err) {
    
      log.error(err); 
    } finally {

      t.end();
    }
  });

  tape('convert from original to different sizes and file types', async (t) => {
  
    try {
      const convertArgs = [
        { type: 'medium', size: '100x>', ext: 'png' },
        { type: 'thumbnail', size: '30x>', ext: 'jpg' }
      ];
     
      async function testConvertType(fromFileName, convertArgs) {
        const exampleFile = await fs.readFile(
          path.join(__dirname, 'assets',fromFileName) );
        
        const assets = await ImageConverter(path.join(__dirname, 'results'));
        await assets.saveTempBinary(fromFileName, exampleFile);  
       

        await assets.convert(fromFileName, convertArgs);

        for (let i = 0, l = convertArgs.length; i < l; i++) {
          const convertArg = convertArgs[i]; 
          const statResultOriginalWithId = await gracefulStat(
            path.join(__dirname, 'results', 
              convertArg.type, `example.${convertArg.ext}`));
          t.ok(statResultOriginalWithId, `${convertArg.type} version must be removed`);
        }
      
        const subPath = '74';

        const assetsWithId = await ImageConverter(path.join(__dirname, 'results'));
        await assetsWithId.saveTempBinary(fromFileName, exampleFile);  

        const availableFiles
          = await assetsWithId.convert(fromFileName, convertArgs, {subPath});

        // available files must be convertedArgs.length
        // i.e. the number of conversion types
        // plus the original file

        const convertedPlusOriginal = convertArgs.length + 1;

        t.equal(convertedPlusOriginal, availableFiles.length, 'all types converted');

        for (let i = 0, l = convertArgs.length; i < l; i++) {
          const convertArg = convertArgs[i]; 
          const statResultOriginalWithId = await gracefulStat(
            path.join(__dirname, 'results', 
              subPath, convertArg.type, `example.${convertArg.ext}`));
          t.ok(statResultOriginalWithId, 
            `${convertArg.type} version created from ${fromFileName}`);
        }
      
      }

      for (let key in fileTypes) {
        await testConvertType(`example.${key}`, convertArgs);
      } 
    } catch (err) {
      log.error(err); 

    } finally {
      t.end();
    }
  });
  
  tape('delete all subPath versions', async (t) => {
  
    try {
      
      for (let key in fileTypes) {
        const exampleFile = await fs.readFile(
          path.join(__dirname, 'assets',`example.${key}`) );
       
        const convertArgs = [
          { type: 'medium', size: '100x>', ext: 'png' },
          { type: 'thumbnail', size: '30x>', ext: 'jpg' }
        ];
      
        const subPath = '74';

        const assets = await ImageConverter(path.join(__dirname, 'results'));
        await assets.saveTempBinary(`example.${key}`, exampleFile);  

        await assets.convert(`example.${key}`, convertArgs, {subPath});

        await assets.remove({subPath}); 
        
        for (let i = 0, l = convertArgs.length; i < l; i++) {
          const convertArg = convertArgs[i]; 
          const statResultOriginalWithId = await gracefulStat(
            path.join(__dirname, 'results', subPath, convertArg.type, `example.${convertArg.ext}`));
          t.notOk(statResultOriginalWithId, `${convertArg.type} version must be removed`);
        }

        const statResultOriginalWithId = await gracefulStat(
          path.join(__dirname, 'results', subPath, 'original', `example.${key}`));
        t.notOk(statResultOriginalWithId, 'Original version must be removed');
      }
    } catch (err) {
      log.error(err); 
    } finally {
      t.end();
    }
  });
  
  tape('delete all non subpath versions', async (t) => {
  
    try {
      
      for (let key in fileTypes) {
      
        const exampleFile = await fs.readFile(
          path.join(__dirname, 'assets',`example.${key}`) );
       
        const convertArgs = [
          { type: 'medium', size: '100x>', ext: 'png' },
          { type: 'thumbnail', size: '30x>', ext: 'jpg' }
        ];

        const assets = await ImageConverter(path.join(__dirname, 'results'));
        await assets.saveTempBinary(`example.${key}`, exampleFile);  

        await assets.convert(`example.${key}`, convertArgs);

        const fileTypes = convertArgs.map( a => a.type );

        await assets.remove({ fileName: `example.${key}`, fileTypes }); 

        for (let i = 0, l = convertArgs.length; i < l; i++) {
          const convertArg = convertArgs[i]; 
          const statResultOriginalWithId = await gracefulStat(
            path.join(__dirname, 'results', convertArg.type, `example.${key}`));

          t.notOk(statResultOriginalWithId, `${convertArg.type} version for ${key} must be removed`);

        }

        const statResultOriginalWithId = await gracefulStat(
          path.join(__dirname, 'results', 'original', `example.${key}`));
        t.notOk(statResultOriginalWithId, `Original version for ${key} must be removed`);
      }
    } catch (err) {
      log.error(err); 

    } finally {
      t.end();
    }
  });
  
  tape('check utility method tempfileExists', async (t) => {
    
    try { 
  
      const base64PNGData = await fs.readFile(
        path.join(__dirname, 'assets','example-png.base64'), 'utf8' );
      const assets = await ImageConverter(path.join(__dirname, 'results'));
      const resultBeforeTemp = await assets.tempFileExists('example.png'); 
      t.notOk(resultBeforeTemp, 'temp file not detected'); 
      await assets.saveTempBase64('base64-example', base64PNGData); 
      const resultAfterTemp = await assets.tempFileExists('base64-example.png'); 
      t.ok(resultAfterTemp, 'temp file was detected'); 
    } catch (err) {
      log.error(err); 
    } finally {
      t.end();
    }
  });
  
  tape('convert for visual checking', async (t) => {
  
    try {
      
      const convertArgs = [
        { type: 'huge-900', size: '900x>', ext: 'jpg' },
        { type: 'huge-900', size: '900x>', ext: 'png' },
        { type: 'big-600', size: '600x>', ext: 'jpg' },
        { type: 'big-600', size: '600x>', ext: 'png' },
        { type: 'medium-400', size: '400x>', ext: 'jpg' },
        { type: 'medium-400', size: '400x>', ext: 'png' },
        { type: 'small-200', size: '200x>', ext: 'jpg' },
        { type: 'small-200', size: '200x>', ext: 'png' },
        { type: 'rechner-120', size: '120x>', ext: 'jpg' },
        { type: 'rechner-120', size: '120x>', ext: 'png' },
        { type: 'thumbnail', size: '60x>', ext: 'jpg' },
        { type: 'thumbnail', size: '60x>', ext: 'png' }
      ];
     
      // This is a separate test image generation
      // for images with an alpha channel
      const exampleFile = await fs.readFile(
        path.join(__dirname, 'assets','example-alpha.png') );
      
      const assets = await ImageConverter(path.join(__dirname, 'visual-results'));
      await assets.saveTempBinary('example-alpha.jpg', exampleFile);  

      await assets.convert('example-alpha.jpg', convertArgs);

      // testing other file types
      for (let key in fileTypes) {
        const exampleFile = await fs.readFile(
          path.join(__dirname, 'assets',`example.${key}`) );
        const assets = await ImageConverter(path.join(__dirname, 'visual-results'));
        await assets.saveTempBinary(`example-${key}.${key}`, exampleFile);  
        await assets.convert(`example-${key}.${key}`, convertArgs);
      }

      t.ok(true, 'check quality');

    } catch (err) {
      log.error(err); 

    } finally {
      t.end();
    }
  });
}

main();
