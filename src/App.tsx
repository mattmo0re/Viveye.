import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AudioEngine, {
  CompressorSettings,
  DelaySettings,
  EQSettings,
  BeatAnalysis,
  ReverbSettings,
  PlaybackAlignment,
  VolumeSettings
} from './audio/AudioEngine';
import SliderControl from './components/SliderControl';
import './App.css';

const defaultVolumes: VolumeSettings = {
  beat: 0.85,
  vocal: 1,
  master: 0.9
};

const defaultEQ: EQSettings = {
  low: 0,
  mid: 0,
  high: 0
};

const defaultCompressor: CompressorSettings = {
  threshold: -18,
  knee: 30,
  ratio: 3,
  attack: 0.003,
  release: 0.25
};

const defaultDelay: DelaySettings = {
  time: 0.28,
  feedback: 0.35,
  mix: 0.25
};

const defaultReverb: ReverbSettings = {
  duration: 2.5,
  decay: 2.2,
  mix: 0.3
};

const formatDuration = (duration: number | null) => {
  if (!duration) return '0:00';
  const minutes = Math.floor(duration / 60);
  const seconds = Math.round(duration % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

function App() {
  const engineRef = useRef<AudioEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [volumes, setVolumes] = useState(defaultVolumes);
  const [eqSettings, setEqSettings] = useState(defaultEQ);
  const [compressor, setCompressor] = useState(defaultCompressor);
  const [delaySettings, setDelaySettings] = useState(defaultDelay);
  const [reverbSettings, setReverbSettings] = useState(defaultReverb);

  const [beatName, setBeatName] = useState<string>('');
  const [beatDuration, setBeatDuration] = useState<number | null>(null);
  const [beatTempo, setBeatTempo] = useState<number | null>(null);
  const [downbeatOffset, setDownbeatOffset] = useState<number | null>(null);
  const [vocalDuration, setVocalDuration] = useState<number | null>(null);
  const [alignmentShift, setAlignmentShift] = useState<number | null>(null);
  const [alignmentTarget, setAlignmentTarget] = useState<number | null>(null);
  const [beatWaveform, setBeatWaveform] = useState<number[] | null>(null);
  const [vocalWaveform, setVocalWaveform] = useState<number[] | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Drop in your beat to get started.');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const engine = new AudioEngine();
    engineRef.current = engine;
    engine.initialize().catch((error) => {
      console.error(error);
      setErrorMessage('Failed to initialise audio engine. Please refresh the page.');
    });
    engine.onPlaybackStateChange = setIsPlaying;
    engine.onRecordingStateChange = setIsRecording;
    engine.onVocalUpdated = (duration) => {
      setVocalDuration(duration);
      setVocalWaveform(engine.getVocalWaveform());
      if (duration) {
        setStatusMessage('Vocal take captured. Dial in the mix and master the bounce.');
      } else {
        setStatusMessage('Vocal take cleared. Ready when you are.');
      }
    };

    return () => {
      engine.dispose();
    };
  }, []);

  const handleBeatLoad = useCallback(
    async (file: File) => {
      if (!engineRef.current) return;
      setErrorMessage(null);
      try {
        setStatusMessage('Loading beat...');
        const analysis: BeatAnalysis = await engineRef.current.loadBeat(file);
        setBeatDuration(analysis.duration);
        setBeatTempo(analysis.tempo);
        setDownbeatOffset(analysis.downbeatOffset);
        setAlignmentShift(null);
        setAlignmentTarget(null);
        setBeatName(file.name);
        setBeatWaveform(engineRef.current?.getBeatWaveform() ?? null);
        setStatusMessage(
          analysis.tempo
            ? `Beat ready. Tempo locked at ${analysis.tempo.toFixed(1)} BPM.`
            : 'Beat ready. Set your levels and record when you are inspired.'
        );
      } catch (error) {
        console.error(error);
        setErrorMessage('Could not load the beat. Please try a different file.');
        setStatusMessage('Drop in your beat to get started.');
        setBeatTempo(null);
        setDownbeatOffset(null);
        setBeatWaveform(null);
      }
    },
    []
  );

  const isAudioFile = useCallback((file: File) => {
    if (file.type.startsWith('audio')) {
      return true;
    }

    const audioExtensions = ['.wav', '.mp3', '.flac', '.aiff', '.aac', '.ogg', '.m4a', '.webm'];
    const lowerName = file.name.toLowerCase();
    return audioExtensions.some((extension) => lowerName.endsWith(extension));
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file && isAudioFile(file)) {
        void handleBeatLoad(file);
      } else {
        setErrorMessage('Unsupported file. Please drop an audio file.');
      }
    },
    [handleBeatLoad, isAudioFile]
  );

  const handleFileInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (!isAudioFile(file)) {
          setErrorMessage('Unsupported file. Please choose an audio file.');
          return;
        }
        void handleBeatLoad(file);
      }
    },
    [handleBeatLoad, isAudioFile]
  );

  const handlePlay = useCallback(async () => {
    if (!engineRef.current) return;
    setErrorMessage(null);
    try {
      const alignment: PlaybackAlignment = await engineRef.current.startPlayback();
      setAlignmentShift(alignment.alignmentShift);
      setAlignmentTarget(alignment.quantizedTarget);
      if (alignment.alignmentShift !== null) {
        const shiftMs = Math.round(alignment.alignmentShift * 1000);
        if (shiftMs === 0) {
          setStatusMessage('Playback rolling. Vocal take already locked to the grid.');
        } else if (shiftMs > 0) {
          setStatusMessage(
            `Playback rolling. Vocal pushed forward ${shiftMs}ms to flow with the beat.`
          );
        } else {
          setStatusMessage(
            `Playback rolling. Vocal pulled back ${Math.abs(shiftMs)}ms to stay on beat.`
          );
        }
      } else {
        setStatusMessage('Playback rolling. Adjust effects in real time.');
      }
    } catch (error) {
      console.error(error);
      setErrorMessage((error as Error).message);
    }
  }, []);

  const handleStop = useCallback(() => {
    engineRef.current?.stopPlayback();
    setStatusMessage('Playback stopped. Ready for adjustments.');
    setAlignmentShift(null);
    setAlignmentTarget(null);
  }, []);

  const handleRecordToggle = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    setErrorMessage(null);
    try {
      if (engine.isRecording) {
        await engine.stopRecording();
        setStatusMessage('Recording stopped. Review your take.');
        setAlignmentShift(null);
        setAlignmentTarget(null);
      } else {
        if (engine.beatDuration) {
          await engine.startPlayback();
        }
        await engine.startRecording();
        setStatusMessage('Recording vocals. Deliver your best take.');
      }
    } catch (error) {
      console.error(error);
      setErrorMessage('Recording failed. Check microphone permissions and try again.');
    }
  }, []);

  const handleExport = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    setErrorMessage(null);
    if (isExporting) return;
    try {
      setIsExporting(true);
      setStatusMessage('Rendering your master...');
      const blob = await engine.exportMix();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'viveye-master.webm';
      anchor.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Master exported. Share it with the world.');
    } catch (error) {
      console.error(error);
      setErrorMessage((error as Error).message);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  const clearVocal = useCallback(() => {
    engineRef.current?.clearVocalTake();
    setAlignmentShift(null);
    setAlignmentTarget(null);
    setVocalWaveform(null);
  }, []);

  useEffect(() => {
    engineRef.current?.setVolumeSettings(volumes);
  }, [volumes]);

  useEffect(() => {
    engineRef.current?.setEQSettings(eqSettings);
  }, [eqSettings]);

  useEffect(() => {
    engineRef.current?.setCompressorSettings(compressor);
  }, [compressor]);

  useEffect(() => {
    engineRef.current?.setDelaySettings(delaySettings);
  }, [delaySettings]);

  useEffect(() => {
    engineRef.current?.setReverbSettings(reverbSettings);
  }, [reverbSettings]);

  const beatGridMarkers = useMemo(() => {
    if (beatTempo && beatDuration) {
      const beatLength = 60 / beatTempo;
      const totalBeats = Math.ceil(beatDuration / beatLength);
      const clamped = Math.min(64, Math.max(8, totalBeats));
      return Array.from({ length: clamped }, (_, index) => index);
    }
    return Array.from({ length: 16 }, (_, index) => index);
  }, [beatDuration, beatTempo]);

  const renderWaveform = useCallback(
    (data: number[] | null, placeholder: string) => {
      if (!data || data.length === 0) {
        return <div className="track-waveform__placeholder">{placeholder}</div>;
      }
      return (
        <div className="track-waveform__bars">
          {data.map((value, index) => (
            <span key={index} style={{ height: `${Math.max(8, value * 100)}%` }} />
          ))}
        </div>
      );
    },
    []
  );

  const effectControls = useMemo(
    () => (
      <div className="effects-grid">
        <section className="module">
          <header>
            <h2>Balance</h2>
            <p>Blend the beat and vocal capture to sit the performance correctly.</p>
          </header>
          <div className="module-body">
            <SliderControl
              label="Beat Level"
              value={volumes.beat}
              min={0}
              max={2}
              step={0.01}
              onChange={(value) => setVolumes((prev) => ({ ...prev, beat: value }))}
            />
            <SliderControl
              label="Vocal Level"
              value={volumes.vocal}
              min={0}
              max={2}
              step={0.01}
              onChange={(value) => setVolumes((prev) => ({ ...prev, vocal: value }))}
            />
            <SliderControl
              label="Master Output"
              value={volumes.master}
              min={0}
              max={2}
              step={0.01}
              onChange={(value) => setVolumes((prev) => ({ ...prev, master: value }))}
            />
          </div>
        </section>

        <section className="module">
          <header>
            <h2>Tone Sculpting</h2>
            <p>Shape the vocal to sit in the mix and leave the beat breathing.</p>
          </header>
          <div className="module-body">
            <SliderControl
              label="Low Shelf (dB)"
              value={eqSettings.low}
              min={-12}
              max={12}
              step={0.5}
              onChange={(value) => setEqSettings((prev) => ({ ...prev, low: value }))}
            />
            <SliderControl
              label="Presence (dB)"
              value={eqSettings.mid}
              min={-12}
              max={12}
              step={0.5}
              onChange={(value) => setEqSettings((prev) => ({ ...prev, mid: value }))}
            />
            <SliderControl
              label="Air (dB)"
              value={eqSettings.high}
              min={-12}
              max={12}
              step={0.5}
              onChange={(value) => setEqSettings((prev) => ({ ...prev, high: value }))}
            />
          </div>
        </section>

        <section className="module">
          <header>
            <h2>Dynamics</h2>
            <p>Keep takes controlled and polished with transparent compression.</p>
          </header>
          <div className="module-body">
            <SliderControl
              label="Threshold (dB)"
              value={compressor.threshold}
              min={-60}
              max={0}
              step={1}
              onChange={(value) => setCompressor((prev) => ({ ...prev, threshold: value }))}
            />
            <SliderControl
              label="Ratio"
              value={compressor.ratio}
              min={1}
              max={12}
              step={0.1}
              onChange={(value) => setCompressor((prev) => ({ ...prev, ratio: value }))}
            />
            <SliderControl
              label="Attack (s)"
              value={compressor.attack}
              min={0.001}
              max={0.1}
              step={0.001}
              onChange={(value) => setCompressor((prev) => ({ ...prev, attack: value }))}
            />
            <SliderControl
              label="Release (s)"
              value={compressor.release}
              min={0.05}
              max={1}
              step={0.01}
              onChange={(value) => setCompressor((prev) => ({ ...prev, release: value }))}
            />
          </div>
        </section>

        <section className="module">
          <header>
            <h2>Space &amp; Depth</h2>
            <p>Add delay and reverb to taste for movement and atmosphere.</p>
          </header>
          <div className="module-split">
            <div className="module-body">
              <h3>Delay</h3>
              <SliderControl
                label="Time (s)"
                value={delaySettings.time}
                min={0}
                max={0.9}
                step={0.01}
                onChange={(value) => setDelaySettings((prev) => ({ ...prev, time: value }))}
              />
              <SliderControl
                label="Feedback"
                value={delaySettings.feedback}
                min={0}
                max={0.9}
                step={0.01}
                onChange={(value) => setDelaySettings((prev) => ({ ...prev, feedback: value }))}
              />
              <SliderControl
                label="Mix"
                value={delaySettings.mix}
                min={0}
                max={1}
                step={0.01}
                onChange={(value) => setDelaySettings((prev) => ({ ...prev, mix: value }))}
              />
            </div>
            <div className="module-body">
              <h3>Reverb</h3>
              <SliderControl
                label="Length (s)"
                value={reverbSettings.duration}
                min={0.5}
                max={6}
                step={0.1}
                onChange={(value) => setReverbSettings((prev) => ({ ...prev, duration: value }))}
              />
              <SliderControl
                label="Decay"
                value={reverbSettings.decay}
                min={0.5}
                max={4}
                step={0.1}
                onChange={(value) => setReverbSettings((prev) => ({ ...prev, decay: value }))}
              />
              <SliderControl
                label="Mix"
                value={reverbSettings.mix}
                min={0}
                max={1}
                step={0.01}
                onChange={(value) => setReverbSettings((prev) => ({ ...prev, mix: value }))}
              />
            </div>
          </div>
        </section>
      </div>
    ),
    [compressor, delaySettings, eqSettings, reverbSettings, volumes]
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>vocalstudio</h1>
          <p>
            Purpose-built for vocalists who already have the beat. Capture, enhance, and master with
            studio-grade processing.
          </p>
        </div>
        <button
          type="button"
          className="primary"
          onClick={() => fileInputRef.current?.click()}
        >
          Import Beat
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={handleFileInput}
        />
      </header>

      <main>
        <section
          className="dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <p className="dropzone-title">Drag &amp; drop your beat</p>
          <p className="dropzone-subtitle">WAV, MP3, FLAC and more are supported.</p>
          {beatName && (
            <div className="beat-summary">
              <strong>{beatName}</strong>
              <span>{formatDuration(beatDuration)}</span>
            </div>
          )}
        </section>

        <section className="track-section">
          <header>
            <div>
              <h2>Tracks</h2>
              <p>Balance your imported beat and captured vocals before fine-tuning the mix.</p>
            </div>
            <div className="track-status">
              <span className={`status-indicator ${isPlaying ? 'active' : ''}`}></span>
              <span>{isPlaying ? 'Playback running' : 'Playback idle'}</span>
            </div>
          </header>
          <div className="track-grid">
            <div className={`track-card ${beatName ? 'track-card--ready' : 'track-card--pending'}`}>
              <div className="track-meta">
                <span className="track-label">Beat</span>
                <strong>{beatName || 'Waiting for beat import'}</strong>
              </div>
              <div className="track-details">
                <span>{beatDuration ? formatDuration(beatDuration) : '—:—'}</span>
                <span>{isPlaying ? 'In the mix' : 'Standing by'}</span>
              </div>
              <div className="tempo-readout">
                <span>Tempo</span>
                <strong>{beatTempo ? `${beatTempo.toFixed(1)} BPM` : 'Analyzing…'}</strong>
              </div>
              <div className="track-progress">
                <span style={{ width: beatDuration ? '100%' : '35%' }}></span>
              </div>
            </div>
            <div
              className={`track-card ${
                vocalDuration ? 'track-card--ready' : isRecording ? 'track-card--armed' : 'track-card--pending'
              }`}
            >
              <div className="track-meta">
                <span className="track-label">Vocal</span>
                <strong>
                  {isRecording
                    ? 'Recording in progress'
                    : vocalDuration
                    ? `${formatDuration(vocalDuration)} captured`
                    : 'Ready to record'}
                </strong>
              </div>
              <div className="track-details">
                <span>{vocalDuration ? formatDuration(vocalDuration) : '—:—'}</span>
                <span>{isRecording ? 'Armed' : vocalDuration ? 'Take stored' : 'Standby'}</span>
              </div>
              <div className="tempo-readout">
                <span>Alignment</span>
                <strong>
                  {alignmentShift === null
                    ? 'Waiting for playback'
                    : alignmentShift === 0
                    ? 'Locked to grid'
                    : alignmentShift > 0
                    ? `+${Math.round(alignmentShift * 1000)}ms`
                    : `${Math.round(alignmentShift * 1000)}ms`}
                </strong>
              </div>
              <div className="track-progress">
                <span style={{ width: vocalDuration ? '100%' : isRecording ? '60%' : '25%' }}></span>
              </div>
            </div>
          </div>
        </section>

        <section className="track-editor">
          <div className="track-editor__header">
            <div>
              <h2>Track Editor</h2>
              <p>Line up vocals with the imported beat and keep the groove intact.</p>
            </div>
            <div className="track-editor__meta">
              <span>{beatTempo ? `${beatTempo.toFixed(1)} BPM` : 'Tempo pending'}</span>
              <span>{beatDuration ? formatDuration(beatDuration) : '—:—'}</span>
            </div>
          </div>
          <div className="track-editor__grid">
            <div className="track-lane">
              <div className="track-lane__info">
                <span className="track-lane__label">Beat</span>
                <strong>{beatName || 'Waiting for beat import'}</strong>
                <span className="track-lane__duration">{beatDuration ? formatDuration(beatDuration) : '—:—'}</span>
              </div>
              <div className="track-lane__body">
                <div className="track-lane__grid">
                  {beatGridMarkers.map((marker) => (
                    <span
                      key={`beat-marker-${marker}`}
                      className={`track-lane__grid-line${
                        marker % 4 === 0 ? ' track-lane__grid-line--strong' : ''
                      }`}
                      style={{
                        left: `${(marker / Math.max(1, beatGridMarkers.length - 1)) * 100}%`
                      }}
                    />
                  ))}
                </div>
                <div className="track-waveform track-waveform--beat">
                  {renderWaveform(beatWaveform, 'Awaiting beat import')}
                </div>
              </div>
            </div>
            <div
              className={`track-lane ${vocalDuration ? 'track-lane--active' : ''} ${
                isRecording ? 'track-lane--recording' : ''
              }`}
            >
              <div className="track-lane__info">
                <span className="track-lane__label">Vocal</span>
                <strong>
                  {isRecording
                    ? 'Recording…'
                    : vocalDuration
                    ? `${formatDuration(vocalDuration)} captured`
                    : 'No take captured'}
                </strong>
                <span className="track-lane__duration">
                  {vocalDuration ? formatDuration(vocalDuration) : isRecording ? '● rec' : '—:—'}
                </span>
              </div>
              <div className="track-lane__body">
                <div className="track-lane__grid">
                  {beatGridMarkers.map((marker) => (
                    <span
                      key={`vocal-marker-${marker}`}
                      className={`track-lane__grid-line${
                        marker % 4 === 0 ? ' track-lane__grid-line--strong' : ''
                      }`}
                      style={{
                        left: `${(marker / Math.max(1, beatGridMarkers.length - 1)) * 100}%`
                      }}
                    />
                  ))}
                </div>
                <div className="track-waveform track-waveform--vocal">
                  {renderWaveform(
                    vocalWaveform,
                    isRecording ? 'Capturing take…' : 'Record vocals to populate the lane'
                  )}
                </div>
                {alignmentTarget !== null && (
                  <div className="track-lane__overlay">
                    <span>Quantized start {alignmentTarget.toFixed(2)}s</span>
                    <span>
                      {alignmentShift === null || alignmentShift === 0
                        ? 'Locked to grid'
                        : alignmentShift > 0
                        ? `Shifted +${Math.round(alignmentShift * 1000)}ms`
                        : `Shifted ${Math.round(alignmentShift * 1000)}ms`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="transport">
          <button type="button" onClick={handlePlay} disabled={isRecording}>
            Play
          </button>
          <button type="button" onClick={handleStop}>
            Stop
          </button>
          <button
            type="button"
            className={isRecording ? 'danger' : 'accent'}
            onClick={handleRecordToggle}
          >
            {isRecording ? 'Stop Recording' : 'Record'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Rendering…' : 'Export Master'}
          </button>
          <button type="button" onClick={clearVocal} disabled={!vocalDuration}>
            Clear Vocal Take
          </button>
        </section>

        <section className="timeline">
          <div>
            <h3>Beat</h3>
            <span>{formatDuration(beatDuration)}</span>
          </div>
          <div>
            <h3>Vocal Take</h3>
            <span>{formatDuration(vocalDuration)}</span>
          </div>
          <div>
            <h3>Grid</h3>
            <span>
              {beatTempo
                ? `${beatTempo.toFixed(1)} BPM${
                    downbeatOffset !== null ? ` • Downbeat @ ${downbeatOffset.toFixed(2)}s` : ''
                  }`
                : 'Tempo analysis unavailable'}
            </span>
          </div>
          <div>
            <h3>Vocal Sync</h3>
            <span>
              {alignmentTarget !== null
                ? `Quantized start ${alignmentTarget.toFixed(2)}s${
                    alignmentShift !== null
                      ? ` • Shift ${alignmentShift > 0 ? '+' : ''}${Math.round(alignmentShift * 1000)}ms`
                      : ''
                  }`
                : 'Awaiting playback alignment'}
            </span>
          </div>
          <div>
            <h3>Status</h3>
            <span className="status-message">{statusMessage}</span>
          </div>
        </section>

        {effectControls}
      </main>

      <footer className="notifications">
        {errorMessage ? <p className="error">{errorMessage}</p> : <p>{statusMessage}</p>}
      </footer>
    </div>
  );
}

export default App;
