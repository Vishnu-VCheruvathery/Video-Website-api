require('dotenv').config()
const Redis = require("ioredis")
const {Queue, Worker} = require('bullmq')
const encodeVideo = require('../scripts/encode')
const {AWS_BUCKET, AWS_REGION} = process.env
const s3 = require('../utils/s3Client');
const fs = require('fs');
const path = require('path');

const connection = new Redis(process.env.REDIS_URL, {maxRetriesPerRequest: null})

function findFolderPath(root, folderToFind){
   const items = fs.readdirSync(root, {withFileTypes: true});

   for(const item of items){
    const fullPath = path.join(startPath, item.name)

    if(item.isDirectory()){
      if(item.name === folderToFind){
        return fullPath
      }
    }
   }
}


if(connection){
    console.log('Redis connection successful!')
}

const enCodeQueue = new Queue('encode')
const uploadQueue = new Queue('upload')

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
     const {title, inputPath, outputDir} = job.data;
     const fileStream = fs.createReadStream(inputPath);
        const key = `videos/${title}`;
    const params = {
        Bucket: AWS_BUCKET,
        Key: key,
        Body: fileStream
    }

    try {
           const command = new PutObjectCommand(params)  
           await s3.send(command)
        

          const video = await prisma.video.create({
            data: {
                title: title,
                thumbnail: '',
                path: `https://${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com/videos/${title}`,
                authorId: 7
            }
            });
    } catch (error) {
      console.log(error);
    }
}, {connection})

uploadWorker.on('completed', job => {
    console.log(`${job.id} has completed!`)
})

uploadWorker.on('failed', (job, err) => {
  console.log(`${job.id} has failed with ${err.message}`);
});

module.exports = {enCodeQueue, uploadQueue}
