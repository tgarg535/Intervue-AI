'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface TranscriptEntry {
  speaker: 'user' | 'interviewer';
  text: string;
  id: number;
}

export interface WebsocketHook {
  isConnected: boolean;
  transcript: TranscriptEntry[];
  latestText: string;
  sendAudio: (pcm: Float32Array) => void;
  sendText: (text: string) => void;
  startMic: () => Promise<void>;
  stopMic: () => void;
  isMicActive: boolean;
  setLocalSentiment: (tag: string | null) => void;
  audioPace: number;
  audioPitch: number;
  micLevel: number;
}

const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000';

export function useWebsocket(sessionId: string): WebsocketHook {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [latestText, setLatestText] = useState('');
  const [isMicActive, setIsMicActive] = useState(false);
  const [audioPace, setAudioPace] = useState(0);
  const [audioPitch, setAudioPitch] = useState(0);
  const [micLevel, setMicLevel] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const entryIdRef = useRef(0);
  const localSentimentRef = useRef<string | null>(null);
  const intentionalCloseRef = useRef(false);
  const playbackCursorRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const audioPaceRef = useRef(0);
  const audioPitchRef = useRef(0);
  const micLevelRef = useRef(0);
  const lastUiMetricUpdateRef = useRef(0);
  const silenceTimerRef = useRef<number | null>(null);
  const spokeSinceLastTurnRef = useRef(false);
  const noiseFloorRef = useRef(0.003);
  const maxTurnTimerRef = useRef<number | null>(null);

  const sendAudioChunk = useCallback((float32: Float32Array) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    // Convert Float32 → Int16
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const clamped = Math.max(-1, Math.min(1, float32[i]!));
      int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }

    // Base64-encode
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    const b64 = btoa(binary);
    socket.send(JSON.stringify({
      type: 'audio',
      audio: b64,
      sentiment: localSentimentRef.current,
      pace: audioPaceRef.current,
      pitch: audioPitchRef.current,
      mic_level: micLevelRef.current,
    }));
  }, []);

  const processMicFrame = useCallback((float32: Float32Array) => {
    let sum = 0;
    let zeroCrossings = 0;
    for (let i = 0; i < float32.length; i++) {
      sum += Math.abs(float32[i] ?? 0);
      if (i > 0) {
        const prev = float32[i - 1] ?? 0;
        const curr = float32[i] ?? 0;
        if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) zeroCrossings += 1;
      }
    }
    const avgLevel = sum / float32.length;
    const nextMicLevel = Math.min(100, avgLevel * 260);
    const nextAudioPace = audioPaceRef.current * 0.8 + avgLevel * 120 * 0.2;
    const nextAudioPitch = Math.min(100, (zeroCrossings / float32.length) * 500);
    micLevelRef.current = nextMicLevel;
    audioPaceRef.current = nextAudioPace;
    audioPitchRef.current = nextAudioPitch;

    // Throttle UI state updates to prevent render storms from audio-frame callbacks.
    const now = performance.now();
    if (now - lastUiMetricUpdateRef.current >= 120) {
      lastUiMetricUpdateRef.current = now;
      setMicLevel(nextMicLevel);
      setAudioPace(nextAudioPace);
      setAudioPitch(nextAudioPitch);
    }

    // Auto-close a user turn after brief silence so AI can respond without
    // requiring manual mic stop.
    const socket = socketRef.current;
    const adaptiveThreshold = Math.max(0.006, noiseFloorRef.current * 2.2);
    const speaking = avgLevel > adaptiveThreshold;
    if (speaking) {
      spokeSinceLastTurnRef.current = true;
      if (!maxTurnTimerRef.current && socket && socket.readyState === WebSocket.OPEN) {
        maxTurnTimerRef.current = window.setTimeout(() => {
          const liveSocket = socketRef.current;
          if (liveSocket && liveSocket.readyState === WebSocket.OPEN && spokeSinceLastTurnRef.current) {
            console.log('[WS] max-turn end_of_turn');
            liveSocket.send(JSON.stringify({ type: 'end_of_turn' }));
            spokeSinceLastTurnRef.current = false;
          }
          maxTurnTimerRef.current = null;
        }, 7000);
      }
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else {
      // Continuously adapt ambient-noise baseline while user is not speaking.
      noiseFloorRef.current = noiseFloorRef.current * 0.98 + avgLevel * 0.02;
    }
    if (
      spokeSinceLastTurnRef.current &&
      !silenceTimerRef.current &&
      socket &&
      socket.readyState === WebSocket.OPEN
    ) {
      silenceTimerRef.current = window.setTimeout(() => {
        const liveSocket = socketRef.current;
        if (liveSocket && liveSocket.readyState === WebSocket.OPEN && spokeSinceLastTurnRef.current) {
          console.log('[WS] auto end_of_turn');
          liveSocket.send(JSON.stringify({ type: 'end_of_turn' }));
          spokeSinceLastTurnRef.current = false;
        }
        if (maxTurnTimerRef.current) {
          window.clearTimeout(maxTurnTimerRef.current);
          maxTurnTimerRef.current = null;
        }
        silenceTimerRef.current = null;
      }, 900);
    }
    sendAudioChunk(float32);
  }, [sendAudioChunk]);

  // ─── WebSocket connection ─────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    intentionalCloseRef.current = false;
    const connect = () => {
      const previousSocket = socketRef.current;
      if (
        previousSocket &&
        previousSocket.readyState === WebSocket.OPEN
      ) {
        // Ensure only one live websocket at a time to avoid duplicate audio streams.
        previousSocket.close();
      }

      const url = `${WS_BASE}/ws/interview/${sessionId}`;
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        console.log('[WS] connected');
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as Record<string, unknown>;
          const type = (data['type'] as string) ?? '';

          if (type === 'audio' && typeof data['data'] === 'string') {
            playAudio(data['data']);
          }

          if (type === 'transcript') {
            const speaker = (data['speaker'] as 'user' | 'interviewer') ?? 'interviewer';
            const text = (data['text'] as string) ?? '';
            if (text) {
              setTranscript((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                // Keep one line per speaker turn; merge chunked partials.
                if (last && last.speaker === speaker) {
                  const mergedText = `${last.text} ${text}`.replace(/\s+/g, ' ').trim();
                  next[next.length - 1] = { ...last, text: mergedText };
                } else {
                  entryIdRef.current += 1;
                  next.push({ speaker, text, id: entryIdRef.current });
                }
                return next;
              });
              if (speaker === 'interviewer') setLatestText(text);
            }
          }
        } catch {
          // non-JSON message – ignore
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        if (socketRef.current !== socket) return;
        if (intentionalCloseRef.current) return;
        const attempt = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = attempt;
        const waitMs = Math.min(3000, 250 * attempt);
        reconnectTimerRef.current = window.setTimeout(connect, waitMs);
      };

      socket.onerror = (e) => {
        if (!intentionalCloseRef.current) {
          console.error('[WS] error', e);
        }
      };
    };

    connect();

    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      socketRef.current = null;
    };
  }, [sessionId]);

  // ─── Audio playback (PCM from Gemini) ────────────────────────────────────
  const playAudio = useCallback((base64: string) => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Keep a single playback context and schedule chunks sequentially
      const ctx = playbackCtxRef.current ?? new AudioContext({ sampleRate: 24000 });
      playbackCtxRef.current = ctx;
      const samples = bytes.length / 2;
      const buffer = ctx.createBuffer(1, samples, 24000);
      const channelData = buffer.getChannelData(0);
      const view = new DataView(bytes.buffer);

      for (let i = 0; i < samples; i++) {
        channelData[i] = view.getInt16(i * 2, true) / 32768;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      const startAt = Math.max(ctx.currentTime + 0.01, playbackCursorRef.current || 0);
      source.start(startAt);
      playbackCursorRef.current = startAt + buffer.duration;
    } catch (err) {
      console.error('[Audio] playback error', err);
    }
  }, []);

  // ─── Mic capture (16-bit PCM at 16 kHz → base64 → WebSocket) ────────────
  const startMic = useCallback(async () => {
    if (isMicActive) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = ctx;
      const silent = ctx.createGain();
      silent.gain.value = 0;
      silent.connect(ctx.destination);
      silentGainRef.current = silent;

      const source = ctx.createMediaStreamSource(stream);
      micSourceRef.current = source;
      let useFallbackProcessor = false;

      if ('audioWorklet' in ctx) {
        try {
          await ctx.audioWorklet.addModule('/audio-capture-worklet.js');
          const worklet = new AudioWorkletNode(ctx, 'audio-capture-processor');
          worklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
            processMicFrame(event.data);
          };
          source.connect(worklet);
          worklet.connect(silent);
          workletNodeRef.current = worklet;
        } catch (err) {
          console.warn('[Mic] AudioWorklet unavailable, falling back to ScriptProcessorNode', err);
          useFallbackProcessor = true;
        }
      } else {
        useFallbackProcessor = true;
      }

      if (useFallbackProcessor) {
        const processor = ctx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => {
          const float32 = e.inputBuffer.getChannelData(0);
          processMicFrame(float32);
        };
        source.connect(processor);
        processor.connect(silent);
      }
      setIsMicActive(true);
    } catch (err) {
      console.error('[Mic] access denied', err);
    }
  }, [isMicActive, processMicFrame]);

  const stopMic = useCallback(() => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxTurnTimerRef.current) {
      window.clearTimeout(maxTurnTimerRef.current);
      maxTurnTimerRef.current = null;
    }
    spokeSinceLastTurnRef.current = false;
    noiseFloorRef.current = 0.003;
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    micSourceRef.current?.disconnect();
    micSourceRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    silentGainRef.current?.disconnect();
    silentGainRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    micLevelRef.current = 0;
    audioPaceRef.current = 0;
    audioPitchRef.current = 0;
    setMicLevel(0);
    setAudioPace(0);
    setAudioPitch(0);
    setIsMicActive(false);
    // Signal end of turn to Gemini
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'end_of_turn' }));
    }
  }, []);

  useEffect(() => {
    return () => {
      playbackCtxRef.current?.close();
      playbackCtxRef.current = null;
      playbackCursorRef.current = 0;
    };
  }, []);

  const sendAudio = useCallback((pcm: Float32Array) => {
    sendAudioChunk(pcm);
  }, [sendAudioChunk]);

  const sendText = useCallback((text: string) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'text', text }));
  }, []);

  return {
    isConnected,
    transcript,
    latestText,
    sendAudio,
    sendText,
    startMic,
    stopMic,
    isMicActive,
    setLocalSentiment: (tag: string | null) => {
      localSentimentRef.current = tag;
    },
    audioPace,
    audioPitch,
    micLevel,
  };
}