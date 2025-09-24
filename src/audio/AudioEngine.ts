/* eslint-disable no-underscore-dangle */
export type EQSettings = {
  low: number;
  mid: number;
  high: number;
};

export type CompressorSettings = {
  threshold: number;
  knee: number;
  ratio: number;
  attack: number;
  release: number;
};

export type DelaySettings = {
  time: number;
  feedback: number;
  mix: number;
};

export type ReverbSettings = {
  duration: number;
  decay: number;
  mix: number;
};

export type VolumeSettings = {
  beat: number;
  vocal: number;
  master: number;
};

type RecordingResolver = (buffer: AudioBuffer | null) => void;

type PlaybackStateListener = (isPlaying: boolean) => void;
type RecordingStateListener = (isRecording: boolean) => void;
type VocalUpdatedListener = (duration: number | null) => void;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class AudioEngine {
  private context: AudioContext | null = null;

  private beatBuffer: AudioBuffer | null = null;

  private vocalBuffer: AudioBuffer | null = null;

  private beatGain!: GainNode;

  private vocalGain!: GainNode;

  private masterGain!: GainNode;

  private masterDryGain!: GainNode;

  private delayInput!: GainNode;

  private delayWet!: GainNode;

  private delayFeedback!: GainNode;

  private delayNode!: DelayNode;

  private reverbInput!: GainNode;

  private reverbWet!: GainNode;

  private convolver!: ConvolverNode;

  private eqLow!: BiquadFilterNode;

  private eqMid!: BiquadFilterNode;

  private eqHigh!: BiquadFilterNode;

  private compressor!: DynamicsCompressorNode;

  private recordDestination!: MediaStreamAudioDestinationNode;

  private currentBeatSource: AudioBufferSourceNode | null = null;

  private currentVocalSource: AudioBufferSourceNode | null = null;

  private micStream: MediaStream | null = null;

  private micSource: MediaStreamAudioSourceNode | null = null;

  private vocalRecorder: MediaRecorder | null = null;

  private vocalChunks: Blob[] = [];

  private recordingResolver: RecordingResolver | null = null;

  private _isPlaying = false;

  private _isRecording = false;

  private reverbSettings: ReverbSettings = {
    duration: 2.5,
    decay: 2.2,
    mix: 0.3
  };

  private delaySettings: DelaySettings = {
    time: 0.28,
    feedback: 0.35,
    mix: 0.25
  };

  private eqSettings: EQSettings = {
    low: 0,
    mid: 0,
    high: 0
  };

  private compressorSettings: CompressorSettings = {
    threshold: -18,
    knee: 30,
    ratio: 3,
    attack: 0.003,
    release: 0.25
  };

  private volumeSettings: VolumeSettings = {
    beat: 0.85,
    vocal: 1,
    master: 0.9
  };

  onPlaybackStateChange: PlaybackStateListener | null = null;

  onRecordingStateChange: RecordingStateListener | null = null;

  onVocalUpdated: VocalUpdatedListener | null = null;

  async initialize() {
    if (this.context) return;
    const context = new AudioContext();
    this.context = context;
    this.setupGraph(context);
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      throw new Error('Audio engine not initialised');
    }
    return this.context;
  }

  private setupGraph(context: AudioContext) {
    this.masterGain = context.createGain();
    this.masterGain.gain.value = this.volumeSettings.master;

    this.recordDestination = context.createMediaStreamDestination();
    this.masterGain.connect(context.destination);
    this.masterGain.connect(this.recordDestination);

    this.beatGain = context.createGain();
    this.beatGain.gain.value = this.volumeSettings.beat;

    this.vocalGain = context.createGain();
    this.vocalGain.gain.value = this.volumeSettings.vocal;

    const inputMix = context.createGain();
    this.beatGain.connect(inputMix);
    this.vocalGain.connect(inputMix);

    this.eqLow = context.createBiquadFilter();
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.value = 120;
    this.eqLow.gain.value = this.eqSettings.low;

    this.eqMid = context.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1800;
    this.eqMid.Q.value = 1;
    this.eqMid.gain.value = this.eqSettings.mid;

    this.eqHigh = context.createBiquadFilter();
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.value = 8000;
    this.eqHigh.gain.value = this.eqSettings.high;

    this.compressor = context.createDynamicsCompressor();
    this.updateCompressorNode();

    this.masterDryGain = context.createGain();
    this.masterDryGain.gain.value = this.computeDryGain();
    this.masterDryGain.connect(this.masterGain);

    this.delayInput = context.createGain();
    this.delayNode = context.createDelay(1.5);
    this.delayNode.delayTime.value = this.delaySettings.time;
    this.delayFeedback = context.createGain();
    this.delayFeedback.gain.value = this.delaySettings.feedback;
    this.delayWet = context.createGain();
    this.delayWet.gain.value = this.delaySettings.mix;

    this.delayInput.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayWet);
    this.delayWet.connect(this.masterGain);

    this.reverbInput = context.createGain();
    this.reverbInput.gain.value = this.reverbSettings.mix;
    this.convolver = context.createConvolver();
    this.refreshReverbImpulse();
    this.reverbWet = context.createGain();
    this.reverbWet.gain.value = this.reverbSettings.mix;
    this.reverbInput.connect(this.convolver);
    this.convolver.connect(this.reverbWet);
    this.reverbWet.connect(this.masterGain);

    inputMix.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.compressor);
    this.compressor.connect(this.masterDryGain);
    this.compressor.connect(this.delayInput);
    this.compressor.connect(this.reverbInput);
  }

  private refreshReverbImpulse() {
    const context = this.ensureContext();
    const { duration, decay } = this.reverbSettings;
    const sampleRate = context.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = context.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const impulseData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        impulseData[i] =
          (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    this.convolver.buffer = impulse;
  }

  private updateCompressorNode() {
    if (!this.compressor) return;
    this.compressor.threshold.value = this.compressorSettings.threshold;
    this.compressor.knee.value = this.compressorSettings.knee;
    this.compressor.ratio.value = this.compressorSettings.ratio;
    this.compressor.attack.value = this.compressorSettings.attack;
    this.compressor.release.value = this.compressorSettings.release;
  }

  private computeDryGain() {
    const reverbImpact = clamp(1 - this.reverbSettings.mix * 0.65, 0.3, 1);
    return reverbImpact;
  }

  get isPlaying() {
    return this._isPlaying;
  }

  get isRecording() {
    return this._isRecording;
  }

  get beatDuration() {
    return this.beatBuffer?.duration ?? null;
  }

  get vocalDuration() {
    return this.vocalBuffer?.duration ?? null;
  }

  async loadBeat(file: File) {
    const context = this.ensureContext();
    await context.resume();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await context.decodeAudioData(arrayBuffer);
    this.beatBuffer = buffer;
    return buffer.duration;
  }

  async startPlayback() {
    const context = this.ensureContext();
    await context.resume();
    if (!this.beatBuffer && !this.vocalBuffer) {
      throw new Error('Add a beat or record vocals before playback');
    }
    this.stopPlayback();

    const activeSources: AudioBufferSourceNode[] = [];

    if (this.beatBuffer) {
      const source = context.createBufferSource();
      source.buffer = this.beatBuffer;
      source.connect(this.beatGain);
      activeSources.push(source);
      this.currentBeatSource = source;
    }

    if (this.vocalBuffer) {
      const source = context.createBufferSource();
      source.buffer = this.vocalBuffer;
      source.connect(this.vocalGain);
      activeSources.push(source);
      this.currentVocalSource = source;
    }

    activeSources.forEach((source) => {
      source.onended = () => {
        if (this.currentBeatSource === source) {
          this.currentBeatSource = null;
        }
        if (this.currentVocalSource === source) {
          this.currentVocalSource = null;
        }
        if (!this.currentBeatSource && !this.currentVocalSource) {
          this._isPlaying = false;
          this.onPlaybackStateChange?.(this._isPlaying);
        }
      };
      source.start();
    });

    if (activeSources.length > 0) {
      this._isPlaying = true;
      this.onPlaybackStateChange?.(this._isPlaying);
    }
  }

  stopPlayback() {
    if (this.currentBeatSource) {
      try {
        this.currentBeatSource.onended = null;
        this.currentBeatSource.stop();
      } catch (error) {
        // node may already be stopped
      }
      this.currentBeatSource = null;
    }

    if (this.currentVocalSource) {
      try {
        this.currentVocalSource.onended = null;
        this.currentVocalSource.stop();
      } catch (error) {
        // ignore
      }
      this.currentVocalSource = null;
    }

    if (this._isPlaying) {
      this._isPlaying = false;
      this.onPlaybackStateChange?.(this._isPlaying);
    }
  }

  async startRecording() {
    const context = this.ensureContext();
    await context.resume();
    if (this._isRecording) {
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micStream = stream;
    this.micSource = context.createMediaStreamSource(stream);
    this.micSource.connect(this.vocalGain);

    this.vocalChunks = [];
    this.vocalRecorder = new MediaRecorder(stream);
    this.vocalRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.vocalChunks.push(event.data);
      }
    };
    this.vocalRecorder.onstop = async () => {
      try {
        const blob = new Blob(this.vocalChunks, { type: 'audio/webm' });
        const buffer = await blob.arrayBuffer();
        const decoded = await context.decodeAudioData(buffer);
        this.vocalBuffer = decoded;
        this.onVocalUpdated?.(decoded.duration);
        this.recordingResolver?.(decoded);
      } catch (error) {
        this.recordingResolver?.(null);
      } finally {
        this.cleanupMic();
        this._isRecording = false;
        this.onRecordingStateChange?.(this._isRecording);
      }
    };

    this.vocalRecorder.start();
    this._isRecording = true;
    this.onRecordingStateChange?.(this._isRecording);
  }

  async stopRecording() {
    if (!this._isRecording || !this.vocalRecorder) {
      return null;
    }
    const promise = new Promise<AudioBuffer | null>((resolve) => {
      this.recordingResolver = resolve;
    });
    this.vocalRecorder.stop();
    return promise;
  }

  private cleanupMic() {
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch (error) {
        // ignore disconnection error
      }
      this.micSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    this.vocalRecorder = null;
    this.vocalChunks = [];
    this.recordingResolver = null;
  }

  setVolumeSettings(settings: Partial<VolumeSettings>) {
    this.volumeSettings = { ...this.volumeSettings, ...settings };
    if (this.beatGain && settings.beat !== undefined) {
      this.beatGain.gain.value = clamp(settings.beat, 0, 2);
    }
    if (this.vocalGain && settings.vocal !== undefined) {
      this.vocalGain.gain.value = clamp(settings.vocal, 0, 2);
    }
    if (this.masterGain && settings.master !== undefined) {
      this.masterGain.gain.value = clamp(settings.master, 0, 2);
    }
  }

  setEQSettings(settings: Partial<EQSettings>) {
    this.eqSettings = { ...this.eqSettings, ...settings };
    if (this.eqLow) {
      this.eqLow.gain.value = this.eqSettings.low;
    }
    if (this.eqMid) {
      this.eqMid.gain.value = this.eqSettings.mid;
    }
    if (this.eqHigh) {
      this.eqHigh.gain.value = this.eqSettings.high;
    }
  }

  setCompressorSettings(settings: Partial<CompressorSettings>) {
    this.compressorSettings = { ...this.compressorSettings, ...settings };
    this.updateCompressorNode();
  }

  setDelaySettings(settings: Partial<DelaySettings>) {
    this.delaySettings = { ...this.delaySettings, ...settings };
    if (this.delayNode && settings.time !== undefined) {
      this.delayNode.delayTime.value = clamp(settings.time, 0, 1.5);
    }
    if (this.delayFeedback && settings.feedback !== undefined) {
      this.delayFeedback.gain.value = clamp(settings.feedback, 0, 0.95);
    }
    if (this.delayInput && settings.mix !== undefined) {
      this.delayInput.gain.value = clamp(settings.mix, 0, 1);
    }
    if (this.delayWet && settings.mix !== undefined) {
      this.delayWet.gain.value = clamp(settings.mix, 0, 1.2);
    }
  }

  setReverbSettings(settings: Partial<ReverbSettings>) {
    const updated: ReverbSettings = { ...this.reverbSettings, ...settings };
    this.reverbSettings = updated;
    if (this.reverbInput && settings.mix !== undefined) {
      this.reverbInput.gain.value = clamp(settings.mix, 0, 1.2);
    }
    if (this.reverbWet && settings.mix !== undefined) {
      this.reverbWet.gain.value = clamp(settings.mix, 0, 1.2);
    }
    if (this.masterDryGain) {
      this.masterDryGain.gain.value = this.computeDryGain();
    }
    if (settings.duration !== undefined || settings.decay !== undefined) {
      this.refreshReverbImpulse();
    }
  }

  getPlaybackDuration() {
    return Math.max(this.beatBuffer?.duration ?? 0, this.vocalBuffer?.duration ?? 0);
  }

  async exportMix() {
    const context = this.ensureContext();
    await context.resume();
    const duration = this.getPlaybackDuration();
    if (duration <= 0) {
      throw new Error('Nothing to export. Load a beat or record vocals first.');
    }
    const recorder = new MediaRecorder(this.recordDestination.stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const recordingPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = (event) => {
        reject((event as unknown as { error: Error }).error || new Error('Recording failed'));
      };
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: 'audio/webm' }));
      };
    });

    await this.startPlayback();
    recorder.start();

    window.setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, duration * 1000 + 600);

    return recordingPromise;
  }

  clearVocalTake() {
    this.vocalBuffer = null;
    this.onVocalUpdated?.(null);
  }

  dispose() {
    this.stopPlayback();
    this.cleanupMic();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
  }
}

export default AudioEngine;
