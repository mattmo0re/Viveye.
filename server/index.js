const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/beat/info', async (req, res) => {
  const { url } = req.query;
  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, {
      filter: 'audioonly',
      quality: 'highestaudio',
    });

    res.json({
      title: info.videoDetails.title,
      author: info.videoDetails.author?.name,
      lengthSeconds: Number(info.videoDetails.lengthSeconds),
      thumbnail: info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url,
      format: {
        mimeType: format.mimeType,
        audioBitrate: format.audioBitrate,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve beat info' });
  }
});

app.get('/api/beat/stream', async (req, res) => {
  const { url } = req.query;
  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const stream = ytdl(url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25,
    });

    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Transfer-Encoding', 'chunked');

    stream.on('error', (error) => {
      console.error('Stream error', error);
      res.status(500).end('Failed to stream audio');
    });

    stream.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to stream beat' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
