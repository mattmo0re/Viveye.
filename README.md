# vocalstudio

vocalstudio is a focused audio production environment for artists who already have their beat. Drag and drop your instrumental, capture pristine vocals, shape the performance with studio-grade effects, and master a final bounce ready for sharing.

## Features

- **Beat-first workflow** – import a beat via drag-and-drop or file picker and immediately monitor tempo and length.
- **Tempo intelligence** – automatic BPM and downbeat detection locks the session grid without touching the instrumental.
- **Guided vocal capture** – one-click record with live monitoring, waveform-safe buffering, and automatic take management.
- **Premium processing** powered by the Web Audio API:
  - Three-band equaliser tuned for vocal sculpting.
  - Transparent dynamics control with configurable compressor parameters.
  - Tempo-synced delay with feedback and mix control.
  - Lush algorithmic reverb with adjustable tail length and decay.
- **Instrumental preservation** – the imported beat bypasses vocal effects so its dynamics and tempo remain pristine.
- **Flow alignment** – quantise recorded takes to the detected beat grid for effortless on-tempo playback and export.
- **Master-ready output** – real-time mix adjustments feed a mastering chain that you can export as a high-quality WebM file with a single click.
- **Responsive, modern UI** – clean panels keep the focus on the sound while staying usable on desktops and tablets.
- **Track overview** – dedicated beat and vocal lanes surface statuses at a glance so you can stay organised before mixing.

## Getting started

```bash
npm install
npm run dev
```

The development server is exposed on <http://localhost:5173> by default.

To produce a static build run:

```bash
npm run build
```

The built assets are emitted to the `dist/` directory.

## Recording permissions

The app uses your browser microphone. The first time you hit **Record** your browser will request permission. Granting access is required for vocal capture and for mixdown exports.

## Exporting a mix

When you choose **Export Master** the engine prints the current beat and vocal take through the processing chain to a WebM file. Keep the tab in focus during rendering to ensure uninterrupted capture.

## License

MIT
