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

      const statResultMedium = await gracefulStat(
        path.join(__dirname, 'results', 'medium', 'example.png'), true);

      t.ok(statResultMedium, 'Medium version converted');
     
      const statResultThumbnail = await gracefulStat(
        path.join(__dirname, 'results', 'thumbnail', 'example.jpg'), true);

      t.ok(statResultThumbnail, 'Thumbnail version converted');
    
      const subPath = '74';

      const assetsWithId = await ImageConverter(path.join(__dirname, 'results'));
      await assetsWithId.saveTempBinary('example.jpg', exampleFile);  

      const availableFiles = await assetsWithId.convert('example.jpg', convertArgs, {subPath});

      // available files must be convertedArgs.length
      // i.e. the number of conversion types
      // plus the original file

      const convertedPlusOriginal = convertArgs.length + 1;

      t.equal(convertedPlusOriginal, availableFiles.length, 'all types converted');

      const statResultMediumWithId = await gracefulStat(
        path.join(__dirname, 'results', 'medium', 'example.png'), true);

      t.ok(statResultMediumWithId, 'Medium version with subPath converted');
      
      const statResultThumbnailWithId = await gracefulStat(
        path.join(__dirname, 'results', subPath, 'thumbnail', 'example.jpg'), true);

      t.ok(statResultThumbnailWithId, 'Thumbnail version with subPath converted');
   
       

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
}

main();
