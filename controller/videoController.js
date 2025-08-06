require('dotenv').config()
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const prisma = require("../utils/prismaClient");
const s3 = require('../utils/s3Client');
const encodeVideo = require('../scripts/encode');

const path = require('path');
const { enCodeQueue } = require('../worker/src');

module.exports.getUserVideos = async(req,res) => {
    const {id} = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: {id: Number(id)},
            include: {
                videos: true
            }
        })
         
       if(!user || user.length === 0){
        return res.status(204).json({message: 'No user found!'})
       }

        return res.status(200).json(user)
    } catch (error) {
        console.log(error)
        return res.status(500).json({error: error})
    }
}


module.exports.getAllVideos = async(req,res) => {
    try {
        const videos = await prisma.video.findMany({
              include: {
            author: {
                  select: {
            firstname: true,
            lastname: true,
            id: true
      }
            }
      }
        });
        if(!videos || videos.length === 0){
            return res.status(204).json({message: 'NO content!'})
        }

        return res.status(200).json(videos)
    } catch (error) {
        console.log(error)
        return res.status(500).json({error: error})
    }
}

module.exports.postVideo = async(req,res) => {
    const {title} = req.body;
    const inputPath = req.file.path;
    const outputDir = path.join(__dirname, '..', 'encoded', title)
    // if(!file){
    2
    //     return res.status(400).json({message: 'Please upload file!'})
    // }
 
    try {
        //    await enCodeQueue.add('encode', {title, inputPath, outputDir})
        encodeVideo(inputPath, outputDir, title)
           return res.status(200).json({message: 'Video Uploaded!'})
    } catch (error) {
        console.log(error);
        return res.status(500).json({error: error})
    }
}

