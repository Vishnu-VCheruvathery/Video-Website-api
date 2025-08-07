require('dotenv').config()
const Redis = require("ioredis")
const {Queue, Worker} = require('bullmq')
const {encodeVideo} = require('../scripts/encode')
const {AWS_BUCKET, AWS_REGION} = process.env
const s3 = require('../utils/s3Client');
const fs = require('fs');
const path = require('path');
const { PutObjectCommand } = require('@aws-sdk/client-s3')
const prisma = require('../utils/prismaClient')
console.log('REDIS_URL:', process.env.REDIS_URL);
const connection = new Redis(process.env.REDIS_URL, {maxRetriesPerRequest: null})


if(connection){
    console.log('Redis connection successful!')
}

const enCodeQueue = new Queue('encode', { connection });
const uploadQueue = new Queue('upload', { connection });

const encodeWorker = new Worker('encode', async job => {
      const {title, inputPath, outputDir} = job.data;
      try {
        await encodeVideo(inputPath, outputDir, title)
      } catch (error) {
        console.log(error);
      }

}, {connection})

encodeWorker.on('completed', job => {
    console.log(`${job.id} has completed!`)
})

encodeWorker.on('failed', (job, err) => {
  console.log(`${job.id} has failed with ${err.message}`);
});

const uploadWorker = new Worker('upload', async job => {
     const {title,  outputDir} = job.data;
    
     if (!fs.existsSync(outputDir)) {
  throw new Error(`Output directory not found: ${outputDir}`);
}

    async function uploadDirectoryToS3(localDir, s3Prefix){
      const entries = fs.readdirSync(localDir, {withFileTypes: true});

      for(const entry of entries){
        const fullPath = path.join(localDir, entry.name)
        const s3Key = path.posix.join(s3Prefix, entry.name);

        if(entry.isDirectory()){
          await uploadDirectoryToS3(fullPath, s3Key);
        }else if(entry.isFile()){
          const fileStream = fs.createReadStream(fullPath);
             const params = {
        Bucket: AWS_BUCKET,
        Key: s3Key,
        Body: fileStream,
         ContentType: getContentType(entry.name)
        }

        const command = new PutObjectCommand(params);
        await s3.send(command);
        console.log(`Uploaded: ${s3Key}`)
        }
      }
    }
  
    function getContentType(fileName){
      const ext = path.extname(fileName);
      switch(ext){
        case '.ts': return 'video/MP2T';
        case '.m3u8': return 'application/vnd.apple.mpegurl';
        default: return 'application/octet-stream';
      }
    }


      
 

 try {
    const s3BaseKey = `videos/${title}`;
    await uploadDirectoryToS3(outputDir, s3BaseKey);

    // Save video metadata to DB
    const video = await prisma.video.create({
      data: {
        title,
        thumbnail: '',
        path: `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3BaseKey}/`,
        authorId: 7
      }
    });

    console.log('Metadata saved to DB:', video);
  } catch (error) {
    console.error('Upload worker error:', error);
  }
}, {connection})

uploadWorker.on('completed', job => {
    console.log(`${job.id} has completed!`)
})

uploadWorker.on('failed', (job, err) => {
  console.log(`${job.id} has failed with ${err.message}`);
});

module.exports = {enCodeQueue, uploadQueue, connection}
