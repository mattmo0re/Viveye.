import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type RecordingStatus = 'idle' | 'recording' | 'processing';

type EqBand = 'low' | 'mid' | 'high';

type BeatMetadata = {
  title?: string;
  author?: string;
  lengthSeconds?: number;
  thumbnail?: string;
};

export interface RecordingResult {
  status: RecordingStatus;
  url?: string;
  blob?: Blob;
}

interface EffectSettings {
  voiceIsolation: boolean;
  noiseReducer: boolean;
  clarityBoost: boolean;
  reverbAmount: number;
  eq: Record<EqBand, number>;
  beatGain: number;
  vocalGain: number;
}

interface AudioNodes {
  masterGain: GainNode;
  beatGain: GainNode;
  vocalGain: GainNode;
  noiseReducer: BiquadFilterNode;
  voiceIsolation: BiquadFilterNode;
  clarity: BiquadFilterNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  dryGain: GainNode;
  reverbGain: GainNode;
  convolver: ConvolverNode;
  destination: MediaStreamAudioDestinationNode;
}

const DEFAULT_SETTINGS: EffectSettings = {
  voiceIsolation: true,
  noiseReducer: true,
  clarityBoost: true,
  reverbAmount: 0.2,
  eq: { low: 0, mid: 0, high: 0 },
  beatGain: 0.8,
  vocalGain: 1,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const createImpulseResponse = (context: AudioContext) => {
  const duration = 2.5;
  const decay = 2;
  const sampleRate = context.sampleRate;
  const length = sampleRate * duration;
  const impulse = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }

  return impulse;
};

const formatSeconds = (value?: number) => {
  if (!value) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const useAudioEngine = () => {
  const [settings, setSettings] = useState<EffectSettings>(DEFAULT_SETTINGS);
  const [recording, setRecording] = useState<RecordingResult>({ status: 'idle' });
  const [beatMeta, setBeatMeta] = useState<BeatMetadata | null>(null);
  const [isBeatReady, setIsBeatReady] = useState(false);
  const [isBeatLoading, setIsBeatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNodes | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const beatElementRef = useRef<HTMLAudioElement | null>(null);
  const beatSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ latencyHint: 'interactive' });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const ensureNodes = useCallback(async () => {
    const context = await ensureAudioContext();
    if (!nodesRef.current) {
      const masterGain = context.createGain();
      masterGain.gain.value = 1;

      const beatGain = context.createGain();
      beatGain.gain.value = settings.beatGain;

      const vocalGain = context.createGain();
      vocalGain.gain.value = settings.vocalGain;

      const noiseReducer = context.createBiquadFilter();
      noiseReducer.type = 'highpass';
      noiseReducer.frequency.value = settings.noiseReducer ? 90 : 20;
      noiseReducer.Q.value = 0.7;

      const voiceIsolation = context.createBiquadFilter();
      voiceIsolation.type = settings.voiceIsolation ? 'bandpass' : 'allpass';
      voiceIsolation.frequency.value = 1700;
      voiceIsolation.Q.value = 1.5;

      const clarity = context.createBiquadFilter();
      clarity.type = 'peaking';
      clarity.frequency.value = 3200;
      clarity.Q.value = 1.2;
      clarity.gain.value = settings.clarityBoost ? 2 : 0;

      const eqLow = context.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.value = 150;
      eqLow.gain.value = settings.eq.low;

      const eqMid = context.createBiquadFilter();
      eqMid.type = 'peaking';
      eqMid.frequency.value = 1200;
      eqMid.Q.value = 1;
      eqMid.gain.value = settings.eq.mid;

      const eqHigh = context.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.value = 5000;
      eqHigh.gain.value = settings.eq.high;

      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 22;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.01;
      compressor.release.value = 0.25;

      const dryGain = context.createGain();
      dryGain.gain.value = 1;

      const reverbGain = context.createGain();
      reverbGain.gain.value = settings.reverbAmount;

      const convolver = context.createConvolver();
      convolver.buffer = createImpulseResponse(context);

      const destination = context.createMediaStreamDestination();

      masterGain.connect(context.destination);
      masterGain.connect(destination);

      nodesRef.current = {
        masterGain,
        beatGain,
        vocalGain,
        noiseReducer,
        voiceIsolation,
        clarity,
        eqLow,
        eqMid,
        eqHigh,
        compressor,
        dryGain,
        reverbGain,
        convolver,
        destination,
      };

      noiseReducer.connect(voiceIsolation);
      voiceIsolation.connect(clarity);
      clarity.connect(eqLow);
      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);
      eqHigh.connect(compressor);
      compressor.connect(vocalGain);
      vocalGain.connect(dryGain);
      dryGain.connect(masterGain);

      eqHigh.connect(reverbGain);
      reverbGain.connect(convolver);
      convolver.connect(masterGain);

      beatGain.connect(masterGain);
    }

    return nodesRef.current;
  }, [ensureAudioContext, settings]);

  const connectMicrophone = useCallback(async () => {
    const nodes = await ensureNodes();
    const context = await ensureAudioContext();

    if (!micStreamRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      micStreamRef.current = stream;
    }

    if (!micSourceRef.current) {
      micSourceRef.current = context.createMediaStreamSource(micStreamRef.current);
      micSourceRef.current.connect(nodes.noiseReducer);
    }

    return nodes;
  }, [ensureAudioContext, ensureNodes]);

  const loadBeat = useCallback(
    async (url: string) => {
      setError(null);
      setIsBeatLoading(true);
      setIsBeatReady(false);
      try {
        const infoResponse = await fetch(`/api/beat/info?url=${encodeURIComponent(url)}`);
        if (!infoResponse.ok) {
          throw new Error('Failed to fetch beat metadata.');
        }
        const info = await infoResponse.json();
        setBeatMeta({
          title: info.title,
          author: info.author,
          lengthSeconds: info.lengthSeconds,
          thumbnail: info.thumbnail,
        });

        const context = await ensureAudioContext();
        await ensureNodes();

        if (beatElementRef.current) {
          beatElementRef.current.pause();
        }

        const audioElement = new Audio(`/api/beat/stream?url=${encodeURIComponent(url)}`);
        audioElement.crossOrigin = 'anonymous';
        audioElement.preload = 'auto';
        beatElementRef.current = audioElement;

        if (beatSourceRef.current) {
          beatSourceRef.current.disconnect();
        }

        beatSourceRef.current = context.createMediaElementSource(audioElement);
        const nodes = await ensureNodes();
        beatSourceRef.current.connect(nodes.beatGain);
        setIsBeatReady(true);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load beat');
        setIsBeatReady(false);
      } finally {
        setIsBeatLoading(false);
      }
    },
    [ensureAudioContext, ensureNodes],
  );

  const setBeatVolume = useCallback(
    async (value: number) => {
      const nodes = await ensureNodes();
      nodes.beatGain.gain.value = clamp(value, 0, 1.5);
      setSettings((prev) => ({ ...prev, beatGain: value }));
    },
    [ensureNodes],
  );

  const setVocalVolume = useCallback(
    async (value: number) => {
      const nodes = await ensureNodes();
      nodes.vocalGain.gain.value = clamp(value, 0, 1.8);
      setSettings((prev) => ({ ...prev, vocalGain: value }));
    },
    [ensureNodes],
  );

  const toggleVoiceIsolation = useCallback(
    async (enabled: boolean) => {
      const nodes = await ensureNodes();
      nodes.voiceIsolation.type = enabled ? 'bandpass' : 'allpass';
      setSettings((prev) => ({ ...prev, voiceIsolation: enabled }));
    },
    [ensureNodes],
  );

  const toggleNoiseReducer = useCallback(
    async (enabled: boolean) => {
      const nodes = await ensureNodes();
      nodes.noiseReducer.frequency.value = enabled ? 90 : 20;
      setSettings((prev) => ({ ...prev, noiseReducer: enabled }));
    },
    [ensureNodes],
  );

  const toggleClarity = useCallback(
    async (enabled: boolean) => {
      const nodes = await ensureNodes();
      nodes.clarity.gain.value = enabled ? 2 : 0;
      setSettings((prev) => ({ ...prev, clarityBoost: enabled }));
    },
    [ensureNodes],
  );

  const setEq = useCallback(
    async (band: EqBand, value: number) => {
      const nodes = await ensureNodes();
      const clamped = clamp(value, -12, 12);
      if (band === 'low') nodes.eqLow.gain.value = clamped;
      if (band === 'mid') nodes.eqMid.gain.value = clamped;
      if (band === 'high') nodes.eqHigh.gain.value = clamped;
      setSettings((prev) => ({
        ...prev,
        eq: { ...prev.eq, [band]: clamped },
      }));
    },
    [ensureNodes],
  );

  const setReverb = useCallback(
    async (value: number) => {
      const nodes = await ensureNodes();
      const clamped = clamp(value, 0, 1);
      nodes.reverbGain.gain.value = clamped;
      setSettings((prev) => ({ ...prev, reverbAmount: clamped }));
    },
    [ensureNodes],
  );

  const startBeatPreview = useCallback(async () => {
    if (!beatElementRef.current) return;
    const context = await ensureAudioContext();
    await context.resume();
    beatElementRef.current.currentTime = 0;
    await beatElementRef.current.play();
  }, [ensureAudioContext]);

  const stopBeat = useCallback(() => {
    if (!beatElementRef.current) return;
    beatElementRef.current.pause();
  }, []);

  const startRecording = useCallback(async () => {
    if (!beatElementRef.current) {
      setError('Load a beat before recording.');
      return;
    }

    try {
      const nodes = await connectMicrophone();
      const context = await ensureAudioContext();
      await context.resume();

      if (recorderRef.current?.state === 'recording') {
        return;
      }

      const recorder = new MediaRecorder(nodes.destination.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setRecording({ status: 'processing' });
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        const url = URL.createObjectURL(blob);
        setRecording({ status: 'idle', url, blob });
      };

      setRecording({ status: 'recording' });

      beatElementRef.current.currentTime = 0;
      await beatElementRef.current.play();
      recorder.start();
    } catch (err) {
      console.error(err);
      setError('Microphone access is required to record.');
    }
  }, [connectMicrophone, ensureAudioContext]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    if (beatElementRef.current) {
      beatElementRef.current.pause();
    }
  }, []);

  useEffect(() => {
    return () => {
      beatElementRef.current?.pause();
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop();
      }
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close();
    };
  }, []);

  const beatSummary = useMemo(() => {
    if (!beatMeta) return null;
    return `${beatMeta.title ?? 'Untitled'} • ${beatMeta.author ?? 'Unknown'} • ${formatSeconds(beatMeta.lengthSeconds)}`;
  }, [beatMeta]);

  return {
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
  };
};
