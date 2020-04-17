const tape = require('tape');
const deconstructBase64 = require('mk-deconstruct-base64');
const gracefulStat = require('mk-graceful-stat');
const fs = require('fs').promises;
const path = require('path');
const ImageConverter = require('../');
const log = require('mk-log');
const rimraf = require('rimraf');

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
   
      const base64PNGData = await fs.readFile(
        path.join(__dirname, 'assets','example-png.base64'), 'utf8' );
    
      const deconstructPNG  = deconstructBase64(base64PNGData);  
      const mimeTypePNG = deconstructPNG.mimeType;
      const extensionPNG = deconstructPNG.extension;
      const dataPNG = deconstructPNG.data;

      t.equal(mimeTypePNG, 'image/png', 'mime type for png');
      t.equal(extensionPNG, 'png', 'extension for png');
      t.ok(dataPNG, 'data for png');
      
      const base64JPGData = await fs.readFile(
        path.join(__dirname, 'assets','example-jpg.base64'), 'utf8' );
      
      const deconstructJPG  = deconstructBase64(base64JPGData);  
      const mimeTypeJPG = deconstructJPG.mimeType;
      const extensionJPG = deconstructJPG.extension;
      const dataJPG = deconstructJPG.data;
     

      t.equal(mimeTypeJPG, 'image/jpeg', 'mime type');
      t.equal(extensionJPG, 'jpg', 'extension');
      t.ok(dataJPG, 'data');
    } catch (err) {
    
      log.error(err); 
    } finally {
      
      t.end();
    }
  });
  
  tape('save base64', async (t) => {
  
    try {
  
      const base64PNGData = await fs.readFile(
        path.join(__dirname, 'assets','example-png.base64'), 'utf8' );
      
      const assets = await ImageConverter(path.join(__dirname, 'results'));
      const PNGResult = await assets.saveTempBase64('base64-example', base64PNGData);  
    
      t.ok(PNGResult.stat, 'returning stat object');
      t.equal(PNGResult.mimeType, 'image/png', 'returning stat object');

      const statResultPNG = await gracefulStat(
        path.join(__dirname, 'results', 'tmp', 'base64-example.png'), true);

      t.ok(statResultPNG, 'original base64 as png file saved');
      
      const base64JPGData = await fs.readFile(
        path.join(__dirname, 'assets','example-jpg.base64'), 'utf8' );
      const JPGResult = await assets.saveTempBase64('base64-example', base64JPGData);  

      t.ok(JPGResult.stat, 'returning stat object');
      t.equal(JPGResult.mimeType, 'image/jpeg', 'returning stat object');

      const statResultJPG = await gracefulStat(
        path.join(__dirname, 'results', 'tmp', 'base64-example.jpg'), true);
      
      t.ok(statResultJPG, 'original base64 as jpg saved');

    } catch (err) {
      log.error(err); 

    } finally {

      t.end();
    }
  });
  
  tape('save binary', async (t) => {
  
    try {
      
      const exampleFile = await fs.readFile(
        path.join(__dirname, 'assets','example.jpg') );
      
      const assets = await ImageConverter(path.join(__dirname, 'results'));
      const JPGResult = await assets.saveTempBinary('example.jpg', exampleFile);  
      t.ok(JPGResult.stat, 'returning stat object');
      t.equal(JPGResult.mimeType, 'image/jpeg', 'returning stat object');
      
      const statResult = await gracefulStat(
        path.join(__dirname, 'results', 'tmp', 'example.jpg'), true);
      
      t.ok(statResult, 'original file saved');
      
      const assetsWithId = await ImageConverter(path.join(__dirname, 'results'));
      const result = await assetsWithId.saveTempBinary('example.jpg', exampleFile);  
      t.ok(result.stat, 'returning stat object');
      
      const statResultWithId = await gracefulStat(
        path.join(__dirname, 'results', 'tmp', 'example.jpg'), true);
      
      t.ok(statResultWithId, 'original file saved with subPath');

    } catch (err) {
    
      log.error(err); 
    } finally {

      t.end();
    }
  });
  
  tape('convert from original to different sizes and file types', async (t) => {
  
    try {
      
      const exampleFile = await fs.readFile(
        path.join(__dirname, 'assets','example.jpg') );
      
      const assets = await ImageConverter(path.join(__dirname, 'results'));
      await assets.saveTempBinary('example.jpg', exampleFile);  
     
      const convertArgs = [
        { type: 'medium', size: '100x>', ext: 'png' },
        { type: 'thumbnail', size: '30x>', ext: 'jpg' }
      ];

      await assets.convert('example.jpg', convertArgs);

      for (let i = 0, l = convertArgs.length; i < l; i++) {
        const convertArg = convertArgs[i]; 
        const statResultOriginalWithId = await gracefulStat(
          path.join(__dirname, 'results', 
            convertArg.type, `example.${convertArg.ext}`));
        t.ok(statResultOriginalWithId, `${convertArg.type} version must be removed`);
      }
    
      const subPath = '74';

      const assetsWithId = await ImageConverter(path.join(__dirname, 'results'));
      await assetsWithId.saveTempBinary('example.jpg', exampleFile);  

      const availableFiles = await assetsWithId.convert('example.jpg', convertArgs, {subPath});

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
        t.ok(statResultOriginalWithId, `${convertArg.type} version created`);
      }

    } catch (err) {
      log.error(err); 

    } finally {
      t.end();
    }
  });
  
  tape('delete all subPath versions', async (t) => {
  
    try {
      
      const exampleFile = await fs.readFile(
        path.join(__dirname, 'assets','example.jpg') );
     
      const convertArgs = [
        { type: 'medium', size: '100x>', ext: 'png' },
        { type: 'thumbnail', size: '30x>', ext: 'jpg' }
      ];
    
      const subPath = '74';

      const assets = await ImageConverter(path.join(__dirname, 'results'));
      await assets.saveTempBinary('example.jpg', exampleFile);  

      await assets.convert('example.jpg', convertArgs, {subPath});

      await assets.remove({subPath}); 
      
      for (let i = 0, l = convertArgs.length; i < l; i++) {
        const convertArg = convertArgs[i]; 
        const statResultOriginalWithId = await gracefulStat(
          path.join(__dirname, 'results', subPath, convertArg.type, `example.${convertArg.ext}`));
        t.notOk(statResultOriginalWithId, `${convertArg.type} version must be removed`);
      }

      const statResultOriginalWithId = await gracefulStat(
        path.join(__dirname, 'results', subPath, 'original', 'example.jpg'));

      t.notOk(statResultOriginalWithId, 'Original version must be removed');

    } catch (err) {
      log.error(err); 
    } finally {
      t.end();
    }
  });
  
  tape('delete all non subpath versions', async (t) => {
  
    try {
      
      const exampleFile = await fs.readFile(
        path.join(__dirname, 'assets','example.jpg') );
     
      const convertArgs = [
        { type: 'medium', size: '100x>', ext: 'png' },
        { type: 'thumbnail', size: '30x>', ext: 'jpg' }
      ];

      const assets = await ImageConverter(path.join(__dirname, 'results'));
      await assets.saveTempBinary('example.jpg', exampleFile);  

      await assets.convert('example.jpg', convertArgs);

      const fileTypes = convertArgs.map( a => a.type );

      await assets.remove({ fileName: 'example.jpg', fileTypes }); 

      for (let i = 0, l = convertArgs.length; i < l; i++) {
        const convertArg = convertArgs[i]; 
        const statResultOriginalWithId = await gracefulStat(
          path.join(__dirname, 'results', convertArg.type, 'example.jpg'));

        t.notOk(statResultOriginalWithId, `${convertArg.type} version must be removed`);

      }

      const statResultOriginalWithId = await gracefulStat(
        path.join(__dirname, 'results', 'original', 'example.jpg'));
      t.notOk(statResultOriginalWithId, 'Original version must be removed');
      

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
      //const saveResult = 
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
      
      const exampleFile = await fs.readFile(
        path.join(__dirname, 'assets','example-alpha.png') );
      
      const assets = await ImageConverter(path.join(__dirname, 'visual-results'));
      await assets.saveTempBinary('example-alpha.jpg', exampleFile);  
     
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

      await assets.convert('example-alpha.jpg', convertArgs);

      t.ok(true, 'check quality');

    } catch (err) {
      log.error(err); 

    } finally {
      t.end();
    }
  });
}

main();
