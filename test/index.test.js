const tape = require('tape');
const deconstructBase64 = require('../lib/utils/deconstruct-base64');
const gracefulStat = require('../lib/utils/graceful-stat');
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

    const fakeMimeType = 'image/png'; 
    const fakeData = 'iVBORw0KGgoAAAANSUhEUgA';   
    const fakeBase64 = `data:${fakeMimeType};base64,${fakeData}`;

    await clearTestResults();

    tape('deconstruct', (t) => {
     
      const { mimeType, extension, data } = deconstructBase64(fakeBase64);  

      t.equal(mimeType, fakeMimeType, 'mime type');
      t.equal(extension, 'png', 'extension');
      t.equal(data, fakeData, 'data');

      t.end();
    });
    
    tape('save binary', async (t) => {
    
      try {
        const exampleFile = await fs.readFile(
          path.join(__dirname, 'assets','example.jpg') );
        
        const assets = await ImageConverter(path.join(__dirname, 'results'));
    
        await assets.saveOriginalBinary('example.jpg', exampleFile);  

        const statResult = await gracefulStat(
          path.join(__dirname, 'results', 'original', 'example.jpg'), true);

        t.ok(statResult, 'original file saved');
       
        const id = '74';
        const assetsWithId = await ImageConverter(path.join(__dirname, 'results'), {id});
    
        await assetsWithId.saveOriginalBinary('example.jpg', exampleFile);  

        const statResultWithId = await gracefulStat(
          path.join(__dirname, 'results', id, 'original', 'example.jpg'), true);
        
        t.ok(statResultWithId, 'original file saved with id');

      } catch (err) {
        log.error(err); 

      } finally {

        t.end();
      }
    });
    
    tape('convert from original to different sizes', async (t) => {
    
      try {
        
        const exampleFile = await fs.readFile(
          path.join(__dirname, 'assets','example.jpg') );
        
        const assets = await ImageConverter(path.join(__dirname, 'results'));
        await assets.saveOriginalBinary('example.jpg', exampleFile);  
       
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
      
        const id = '74';

        const assetsWithId = await ImageConverter(path.join(__dirname, 'results'), {id});
        await assetsWithId.saveOriginalBinary('example.jpg', exampleFile);  

        await assetsWithId.convert('example.jpg', convertArgs);

        const statResultMediumWithId = await gracefulStat(
          path.join(__dirname, 'results', id, 'medium', 'example.png'), true);

        t.ok(statResultMediumWithId, 'Medium version with id converted');
        
        const statResultThumbnailWithId = await gracefulStat(
          path.join(__dirname, 'results', id, 'thumbnail', 'example.jpg'), true);

        t.ok(statResultThumbnailWithId, 'Thumbnail version with id converted');
      
      } catch (err) {
        log.error(err); 

      } finally {
        t.end();
      }
    });
  }
  catch (err) {
    log.error(err);
  }
}

main();
