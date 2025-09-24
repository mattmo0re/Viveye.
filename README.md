# Viveye Vocal Lab

Viveye Vocal Lab is a focused vocal production environment that lets artists drag in a YouTube beat, sculpt a vocal chain tailored for rap and R&B takes, and record polished performances directly in the browser. The stack is split between a lightweight Express API that fetches high quality audio from YouTube and a React front-end powered by the Web Audio API.

## Features

- **YouTube beat ingestion** – paste any public YouTube link and the backend streams the high quality audio-only feed for low-latency playback.
- **Realtime vocal chain** – dedicated nodes for voice isolation, noise cleanup, presence boosting, compression, three-band EQ, and controllable reverb.
- **One-click recording** – captures the processed microphone signal and beat mixdown in sync using MediaRecorder, ready for download.
- **Clean production UI** – three-step layout that keeps the emphasis on the recording workflow and effect quality.

## Getting started

### Prerequisites

- Node.js 18+

### Backend

```bash
cd server
npm install
npm run start
```

The API listens on `http://localhost:4000` and exposes:

- `GET /api/beat/info?url=<youtubeUrl>` – fetch metadata and audio format details.
- `GET /api/beat/stream?url=<youtubeUrl>` – stream the audio-only track as `audio/webm`.

### Frontend

In a separate terminal:

```bash
cd client
npm install
npm run dev
```

Vite proxies `/api/*` requests to the local backend for seamless development.

### Recording workflow

1. Paste a YouTube URL into **Load Your Beat** and import.
2. Toggle isolation, cleanup, and clarity modules; fine tune the EQ, reverb, and gain balances.
3. Wear headphones, press **Record Take**, and download the rendered mix once complete.

## Notes

- The Web Audio effect chain is tuned for modern vocal production but can be tweaked further inside `useAudioEngine.ts`.
- Because the MediaRecorder output is `audio/webm`, convert to WAV/MP3 in a DAW if needed.
- For the cleanest recordings, advise vocalists to monitor through closed-back headphones.
