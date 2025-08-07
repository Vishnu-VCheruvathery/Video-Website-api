const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');


ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const resolutions = [
  { name: '360p', size: '640x360', bitrate: '800k' },
  { name: '480p', size: '854x480', bitrate: '1200k' },
  { name: '720p', size: '1280x720', bitrate: '2500k' }
];

// Promisified ffprobe to get video duration
const getVideoDuration = (inputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
};

async function encodeVideo(inputPath, outputDir, baseName) {
  console.log(typeof uploadQueue)
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const duration = await getVideoDuration(inputPath);

  await Promise.all(resolutions.map(({ name, size, bitrate }) => {
    return new Promise((resolve, reject) => {
      const resolutionDir = path.join(outputDir, name);
      if (!fs.existsSync(resolutionDir)) {
        fs.mkdirSync(resolutionDir, { recursive: true });
      }

      let lastLogged = 0;

      ffmpeg(inputPath)
        .addOptions([
          `-s ${size}`,
          `-b:v ${bitrate}`,
          '-hls_time 10',
          '-hls_list_size 0',
          '-f hls'
        ])
        .output(path.join(resolutionDir, `${baseName + name}.m3u8`))
        .on('progress', (progress) => {
          const timeParts = progress.timemark.split(':').map(parseFloat);
          const currentSeconds = (timeParts[0] * 3600) + (timeParts[1] * 60) + timeParts[2];
          const percent = Math.min((currentSeconds / duration) * 100, 100);

          if (percent - lastLogged >= 5 || percent === 100) {
            console.log(`[${name}] Encoding Progress: ${percent.toFixed(2)}%`);
            lastLogged = percent;
          }
        })
        .on('end', () => {
          console.log(`[${name}] Encoding Complete`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[${name}] Encoding Error:`, err);
          reject(err);
        })
        .run();
    });
  }));

try {
  const { uploadQueue } = require('../worker/src'); // ← import here, not top-level
  if (uploadQueue && typeof uploadQueue.add === 'function') {
    await uploadQueue.add('upload', { title:baseName, outputDir });
  } else {
    console.error("uploadQueue is not properly initialized.");
  }
} catch (err) {
  console.error("Failed to access uploadQueue:", err);
}
}

module.exports = {encodeVideo};