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

type PlaybackStateListener = (isPlaying: boolean) => void;
type RecordingStateListener = (isRecording: boolean) => void;
type VocalUpdatedListener = (duration: number | null) => void;

export type BeatAnalysis = {
  duration: number;
  tempo: number | null;
  downbeatOffset: number | null;
};

export type PlaybackAlignment = {
  alignmentShift: number | null;
  quantizedTarget: number | null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class AudioEngine {
  private context: AudioContext | null = null;

  private beatBuffer: AudioBuffer | null = null;

  private vocalBuffer: AudioBuffer | null = null;

  private beatGain!: GainNode;

  private vocalGain!: GainNode;

  private vocalChainInput!: GainNode;

  private masterGain!: GainNode;

  private masterDryGain!: GainNode;

  private vocalPostGain!: GainNode;

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

  private recorderNode: AudioWorkletNode | ScriptProcessorNode | null = null;

  private recorderMonitor: GainNode | null = null;

  private recordingChunks: Float32Array[][] = [];

  private recordingLength = 0;

  private recordingSampleRate = 44100;

  private recordingChannelCount = 0;

  private audioWorkletModuleLoaded = false;

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

  private beatTempo: number | null = null;

  private beatDownbeatOffset: number | null = null;

  private vocalOnset: number | null = null;

  private beatWaveform: number[] | null = null;

  private vocalWaveform: number[] | null = null;

  private lastAlignment: PlaybackAlignment = {
    alignmentShift: null,
    quantizedTarget: null
  };

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
    this.beatGain.connect(this.masterGain);

    this.vocalGain = context.createGain();
    this.vocalGain.gain.value = this.volumeSettings.vocal;

    this.vocalChainInput = context.createGain();
    this.vocalGain.connect(this.vocalChainInput);

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

    this.vocalPostGain = context.createGain();
    this.vocalPostGain.gain.value = 1;

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

    this.vocalChainInput.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.compressor);
    this.compressor.connect(this.vocalPostGain);
    this.vocalPostGain.connect(this.masterDryGain);
    this.vocalPostGain.connect(this.delayInput);
    this.vocalPostGain.connect(this.reverbInput);
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

  private appendRecordingChunk(chunk: Float32Array[]) {
    if (!chunk || chunk.length === 0) {
      return;
    }
    const safeChunk = chunk.map((channel) => new Float32Array(channel));
    if (this.recordingChannelCount === 0) {
      this.recordingChannelCount = safeChunk.length;
    }
    this.recordingChunks.push(safeChunk);
    if (safeChunk[0]) {
      this.recordingLength += safeChunk[0].length;
    }
  }

  private disposeRecorderNode() {
    if (this.recorderNode) {
      try {
        this.vocalPostGain.disconnect(this.recorderNode as unknown as AudioNode);
      } catch (error) {
        // ignore disconnection errors
      }
      if (this.recorderNode instanceof AudioWorkletNode) {
        this.recorderNode.port.onmessage = null;
      } else {
        (this.recorderNode as ScriptProcessorNode).onaudioprocess = null;
      }
      try {
        (this.recorderNode as unknown as AudioNode).disconnect();
      } catch (error) {
        // ignore
      }
      this.recorderNode = null;
    }
    if (this.recorderMonitor) {
      try {
        this.recorderMonitor.disconnect();
      } catch (error) {
        // ignore
      }
      this.recorderMonitor = null;
    }
  }

  private async prepareRecorderNode(context: AudioContext) {
    this.disposeRecorderNode();
    this.recordingChunks = [];
    this.recordingLength = 0;
    this.recordingChannelCount = 0;
    this.recordingSampleRate = context.sampleRate;

    if (typeof AudioWorkletNode !== 'undefined' && context.audioWorklet) {
      try {
        if (!this.audioWorkletModuleLoaded) {
          await context.audioWorklet.addModule(new URL('./recorderWorklet.js', import.meta.url));
          this.audioWorkletModuleLoaded = true;
        }
        const node = new AudioWorkletNode(context, 'vocal-recorder', {
          numberOfInputs: 1,
          numberOfOutputs: 0
        });
        node.port.onmessage = (event) => {
          const data = event.data as Float32Array[];
          if (Array.isArray(data)) {
            this.appendRecordingChunk(data);
          }
        };
        this.recorderNode = node;
        this.vocalPostGain.connect(node);
        return;
      } catch (error) {
        console.warn('Falling back to ScriptProcessor for recording', error);
      }
    }

    const channelCount = Math.max(1, this.vocalPostGain.channelCount || this.vocalPostGain.numberOfOutputs || 1);
    const processor = context.createScriptProcessor(4096, channelCount, 1);
    processor.onaudioprocess = (event) => {
      const chunk: Float32Array[] = [];
      for (let channel = 0; channel < event.inputBuffer.numberOfChannels; channel += 1) {
        const channelData = event.inputBuffer.getChannelData(channel);
        chunk.push(new Float32Array(channelData));
      }
      this.appendRecordingChunk(chunk);
    };
    const monitor = context.createGain();
    monitor.gain.value = 0;
    processor.connect(monitor);
    monitor.connect(context.destination);
    this.vocalPostGain.connect(processor);
    this.recorderMonitor = monitor;
    this.recorderNode = processor;
  }

  private buildRecordedBuffer(context: AudioContext) {
    if (!this.recordingChunks.length || this.recordingChannelCount === 0 || this.recordingLength === 0) {
      return context.createBuffer(1, 1, context.sampleRate);
    }
    const buffer = context.createBuffer(this.recordingChannelCount, this.recordingLength, this.recordingSampleRate);
    const channelData: Float32Array[] = [];
    for (let channel = 0; channel < this.recordingChannelCount; channel += 1) {
      channelData[channel] = buffer.getChannelData(channel);
    }
    let offset = 0;
    this.recordingChunks.forEach((chunk) => {
      const length = chunk[0]?.length ?? 0;
      for (let channel = 0; channel < this.recordingChannelCount; channel += 1) {
        const target = channelData[channel];
        const source = chunk[channel] ?? chunk[0];
        if (target && source) {
          target.set(source, offset);
        }
      }
      offset += length;
    });
    return buffer;
  }

  private createWaveform(buffer: AudioBuffer, resolution = 512) {
    const data: number[] = [];
    if (!buffer) {
      return data;
    }
    const totalSamples = buffer.length;
    const channels = buffer.numberOfChannels;
    if (totalSamples === 0 || channels === 0) {
      return data;
    }
    const samplesPerBucket = Math.max(1, Math.floor(totalSamples / resolution));
    const bucketCount = Math.min(resolution, Math.ceil(totalSamples / samplesPerBucket));
    for (let bucket = 0; bucket < bucketCount; bucket += 1) {
      let peak = 0;
      const start = bucket * samplesPerBucket;
      const end = Math.min(totalSamples, start + samplesPerBucket);
      for (let index = start; index < end; index += 1) {
        let sum = 0;
        for (let channel = 0; channel < channels; channel += 1) {
          const channelData = buffer.getChannelData(channel);
          sum += Math.abs(channelData[index]);
        }
        const value = sum / channels;
        if (value > peak) {
          peak = value;
        }
      }
      data.push(peak);
    }
    const max = data.reduce((acc, value) => Math.max(acc, value), 0);
    if (max > 0) {
      for (let i = 0; i < data.length; i += 1) {
        data[i] = Math.min(1, data[i] / max);
      }
    }
    return data;
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

  getBeatWaveform() {
    return this.beatWaveform;
  }

  getVocalWaveform() {
    return this.vocalWaveform;
  }

  async loadBeat(file: File): Promise<BeatAnalysis> {
    const context = this.ensureContext();
    await context.resume();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await context.decodeAudioData(arrayBuffer);
    this.beatBuffer = buffer;
    this.beatWaveform = this.createWaveform(buffer);
    const { tempo, downbeatOffset } = this.analyseBeat(buffer);
    this.beatTempo = tempo;
    this.beatDownbeatOffset = downbeatOffset;
    return {
      duration: buffer.duration,
      tempo,
      downbeatOffset
    };
  }

  async startPlayback(): Promise<PlaybackAlignment> {
    const context = this.ensureContext();
    await context.resume();
    if (!this.beatBuffer && !this.vocalBuffer) {
      throw new Error('Add a beat or record vocals before playback');
    }
    this.stopPlayback();

    const activeSources: AudioBufferSourceNode[] = [];
    const baseStartTime = context.currentTime + 0.1;
    this.lastAlignment = {
      alignmentShift: null,
      quantizedTarget: null
    };

    if (this.beatBuffer) {
      const source = context.createBufferSource();
      source.buffer = this.beatBuffer;
      source.playbackRate.value = 1;
      source.connect(this.beatGain);
      activeSources.push(source);
      this.currentBeatSource = source;
      source.start(baseStartTime);
    }

    if (this.vocalBuffer) {
      const source = context.createBufferSource();
      source.buffer = this.vocalBuffer;
      source.connect(this.vocalGain);
      let startTime = baseStartTime;
      let offset = 0;
      if (this.beatTempo && this.vocalOnset !== null) {
        const beatLength = 60 / this.beatTempo;
        const quantized = Math.round(this.vocalOnset / beatLength) * beatLength;
        const clampedQuantized = Math.max(0, quantized);
        if (clampedQuantized <= this.vocalOnset) {
          offset = clamp(this.vocalOnset - clampedQuantized, 0, this.vocalBuffer.duration);
        } else {
          startTime += clampedQuantized - this.vocalOnset;
        }
        this.lastAlignment = {
          alignmentShift: clampedQuantized - this.vocalOnset,
          quantizedTarget: clampedQuantized
        };
      }
      source.start(startTime, offset);
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
    });

    if (activeSources.length > 0) {
      this._isPlaying = true;
      this.onPlaybackStateChange?.(this._isPlaying);
    }
    return this.lastAlignment;
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
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 2,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: context.sampleRate
      }
    });
    this.micStream = stream;
    this.micSource = context.createMediaStreamSource(stream);
    this.micSource.connect(this.vocalGain);

    await this.prepareRecorderNode(context);
    this._isRecording = true;
    this.onRecordingStateChange?.(this._isRecording);
  }

  async stopRecording() {
    if (!this._isRecording) {
      return null;
    }
    const context = this.ensureContext();
    const buffer = this.buildRecordedBuffer(context);
    this.vocalBuffer = buffer;
    this.vocalWaveform = this.createWaveform(buffer);
    this.vocalOnset = this.measureOnset(buffer);
    this._isRecording = false;
    this.onRecordingStateChange?.(this._isRecording);
    this.onVocalUpdated?.(buffer.duration);
    this.cleanupMic();
    return buffer;
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
    this.disposeRecorderNode();
    this.recordingChunks = [];
    this.recordingLength = 0;
    this.recordingChannelCount = 0;
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
    this.vocalOnset = null;
    this.vocalWaveform = null;
    this.lastAlignment = {
      alignmentShift: null,
      quantizedTarget: null
    };
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

  getBeatTempo() {
    return this.beatTempo;
  }

  getBeatDownbeatOffset() {
    return this.beatDownbeatOffset;
  }

  getLastAlignment() {
    return this.lastAlignment;
  }

  private analyseBeat(buffer: AudioBuffer) {
    try {
      const sampleRate = buffer.sampleRate;
      const step = Math.max(1, Math.floor(sampleRate / 500));
      const downsampledRate = sampleRate / step;
      const frames = Math.floor(buffer.length / step);
      const envelope = new Float32Array(frames);
      for (let i = 0; i < frames; i += 1) {
        let sum = 0;
        for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
          const channelData = buffer.getChannelData(channel);
          sum += Math.abs(channelData[i * step] ?? 0);
        }
        envelope[i] = sum / buffer.numberOfChannels;
      }

      // Smooth the envelope for more stable autocorrelation.
      const smoothed = new Float32Array(frames);
      const smoothWindow = 4;
      for (let i = 0; i < frames; i += 1) {
        let acc = 0;
        let count = 0;
        for (let j = -smoothWindow; j <= smoothWindow; j += 1) {
          const index = i + j;
          if (index >= 0 && index < frames) {
            acc += envelope[index];
            count += 1;
          }
        }
        smoothed[i] = count > 0 ? acc / count : 0;
      }

      const minBpm = 60;
      const maxBpm = 180;
      const minLag = Math.floor((60 / maxBpm) * downsampledRate);
      const maxLag = Math.floor((60 / minBpm) * downsampledRate);
      let bestLag = 0;
      let bestScore = -Infinity;
      for (let lag = minLag; lag <= maxLag; lag += 1) {
        let score = 0;
        for (let i = 0; i < frames - lag; i += 1) {
          score += smoothed[i] * smoothed[i + lag];
        }
        if (score > bestScore) {
          bestScore = score;
          bestLag = lag;
        }
      }

      const tempo = bestLag > 0 ? (60 * downsampledRate) / bestLag : null;

      let downbeatOffset: number | null = null;
      if (tempo) {
        const searchWindow = Math.min(frames, Math.floor(downsampledRate * 8));
        let peak = 0;
        for (let i = 0; i < searchWindow; i += 1) {
          if (smoothed[i] > peak) {
            peak = smoothed[i];
          }
        }
        const threshold = peak * 0.6;
        for (let i = 0; i < searchWindow; i += 1) {
          if (smoothed[i] >= threshold) {
            downbeatOffset = i / downsampledRate;
            break;
          }
        }
      }

      return {
        tempo,
        downbeatOffset
      };
    } catch (error) {
      console.warn('Beat analysis failed', error);
      return {
        tempo: null,
        downbeatOffset: null
      };
    }
  }

  private measureOnset(buffer: AudioBuffer) {
    const sampleRate = buffer.sampleRate;
    const step = Math.max(1, Math.floor(sampleRate / 1000));
    const frames = Math.floor(buffer.length / step);
    const envelope = new Float32Array(frames);
    for (let i = 0; i < frames; i += 1) {
      let sum = 0;
      for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
        const channelData = buffer.getChannelData(channel);
        sum += Math.abs(channelData[i * step] ?? 0);
      }
      envelope[i] = sum / buffer.numberOfChannels;
    }

    let peak = 0;
    for (let i = 0; i < frames; i += 1) {
      if (envelope[i] > peak) {
        peak = envelope[i];
      }
    }
    if (peak <= 0.00001) {
      return 0;
    }
    const threshold = peak * 0.2;
    for (let i = 0; i < frames; i += 1) {
      if (envelope[i] >= threshold) {
        return i / (sampleRate / step);
      }
    }
    return 0;
  }
}

export default AudioEngine;
