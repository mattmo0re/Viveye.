import { FormEvent, useState } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine';
import './App.css';

function formatGain(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)} dB`;
}

function App() {
  const [beatUrl, setBeatUrl] = useState('');

  const {
    settings,
    recording,
    beatMeta,
    beatSummary,
    isBeatReady,
    isBeatLoading,
    error,
    loadBeat,
    startBeatPreview,
    stopBeat,
    startRecording,
    stopRecording,
    toggleVoiceIsolation,
    toggleNoiseReducer,
    toggleClarity,
    setEq,
    setReverb,
    setBeatVolume,
    setVocalVolume,
  } = useAudioEngine();

  const handleLoadBeat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!beatUrl) return;
    await loadBeat(beatUrl);
  };

  const isRecording = recording.status === 'recording';

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Viveye Vocal Lab</h1>
          <p className="app__tagline">
            Drop in a YouTube beat, dial in your vocal chain, and capture polished performances without leaving your browser.
          </p>
        </div>
      </header>

      <main className="app__content">
        <section className="panel">
          <h2>1. Load Your Beat</h2>
          <form className="panel__form" onSubmit={handleLoadBeat}>
            <input
              type="url"
              placeholder="Paste a YouTube link"
              value={beatUrl}
              onChange={(event) => setBeatUrl(event.target.value)}
              className="panel__input"
              required
            />
            <button type="submit" className="panel__button" disabled={isBeatLoading}>
              {isBeatLoading ? 'Loading…' : 'Import'}
            </button>
          </form>

          {error && <p className="panel__error">{error}</p>}

          {beatMeta && (
            <div className="beat-card">
              {beatMeta.thumbnail && <img src={beatMeta.thumbnail} alt="Beat cover" className="beat-card__thumb" />}
              <div className="beat-card__meta">
                <h3>{beatMeta.title ?? 'Untitled beat'}</h3>
                <p>{beatMeta.author ?? 'Unknown artist'}</p>
                {beatSummary && <span className="beat-card__summary">{beatSummary}</span>}
              </div>
            </div>
          )}

          <div className="panel__actions">
            <button type="button" onClick={startBeatPreview} className="panel__button" disabled={!isBeatReady || isRecording}>
              Preview Beat
            </button>
            <button type="button" onClick={stopBeat} className="panel__button panel__button--secondary">
              Stop
            </button>
          </div>

          <div className="slider-group">
            <label htmlFor="beat-volume">Beat Balance</label>
            <input
              id="beat-volume"
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={settings.beatGain}
              onChange={(event) => setBeatVolume(Number(event.target.value))}
            />
          </div>
        </section>

        <section className="panel">
          <h2>2. Shape Your Vocal Chain</h2>
          <div className="toggle-grid">
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.voiceIsolation}
                onChange={(event) => toggleVoiceIsolation(event.target.checked)}
              />
              <span>
                <strong>Voice Isolation</strong>
                <small>Focus on the vocal band to fight bleed.</small>
              </span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.noiseReducer}
                onChange={(event) => toggleNoiseReducer(event.target.checked)}
              />
              <span>
                <strong>Noise Cleaner</strong>
                <small>High-pass cleanup to cut rumble.</small>
              </span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.clarityBoost}
                onChange={(event) => toggleClarity(event.target.checked)}
              />
              <span>
                <strong>Air Lift</strong>
                <small>Presence boost for crisp consonants.</small>
              </span>
            </label>
          </div>

          <div className="slider-grid">
            <div className="slider-group">
              <label htmlFor="eq-low">Low EQ</label>
              <input
                id="eq-low"
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={settings.eq.low}
                onChange={(event) => setEq('low', Number(event.target.value))}
              />
              <span className="slider-value">{formatGain(settings.eq.low)}</span>
            </div>
            <div className="slider-group">
              <label htmlFor="eq-mid">Body EQ</label>
              <input
                id="eq-mid"
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={settings.eq.mid}
                onChange={(event) => setEq('mid', Number(event.target.value))}
              />
              <span className="slider-value">{formatGain(settings.eq.mid)}</span>
            </div>
            <div className="slider-group">
              <label htmlFor="eq-high">Sparkle EQ</label>
              <input
                id="eq-high"
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={settings.eq.high}
                onChange={(event) => setEq('high', Number(event.target.value))}
              />
              <span className="slider-value">{formatGain(settings.eq.high)}</span>
            </div>
            <div className="slider-group">
              <label htmlFor="reverb">Space</label>
              <input
                id="reverb"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.reverbAmount}
                onChange={(event) => setReverb(Number(event.target.value))}
              />
              <span className="slider-value">{(settings.reverbAmount * 100).toFixed(0)}%</span>
            </div>
            <div className="slider-group">
              <label htmlFor="vocal-gain">Vocal Level</label>
              <input
                id="vocal-gain"
                type="range"
                min={0}
                max={1.8}
                step={0.05}
                value={settings.vocalGain}
                onChange={(event) => setVocalVolume(Number(event.target.value))}
              />
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>3. Record + Bounce</h2>
          <p className="panel__hint">
            Wear headphones for the cleanest take. Hit record and Viveye captures both the beat and your processed vocal in sync.
          </p>

          <div className="panel__actions">
            <button type="button" className="panel__button panel__button--primary" onClick={startRecording} disabled={!isBeatReady || isRecording}>
              {isRecording ? 'Recording…' : 'Record Take'}
            </button>
            <button type="button" className="panel__button panel__button--secondary" onClick={stopRecording} disabled={!isRecording}>
              Stop
            </button>
          </div>

          {recording.status === 'processing' && <p className="panel__hint">Rendering your mix…</p>}

          {recording.url && recording.status === 'idle' && (
            <div className="render-card">
              <audio controls src={recording.url} />
              <a className="panel__button" href={recording.url} download="viveye-take.webm">
                Download Take
              </a>
            </div>
          )}
        </section>
      </main>

      <footer className="app__footer">
        <p>
          Viveye layers pro vocal tools—voice isolation, noise control, clarity lift, tone shaping, and room glue—into a streamlined workflow built for recording over dropped-in beats.
        </p>
      </footer>
    </div>
  );
}

export default App;
