const express = require('express');
const { getAllVideos, postVideo, getUserVideos } = require('../controller/videoController');
const multer = require('multer')
const router = express.Router();

const upload = multer({dest: 'uploads/'});

router.get('/', getAllVideos);
router.get("/:id", getUserVideos);
router.post('/post', upload.single('file'), postVideo);


module.exports = router