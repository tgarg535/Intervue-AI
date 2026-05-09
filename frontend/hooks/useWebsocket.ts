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
}

const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000';
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export function useWebsocket(sessionId: string): WebsocketHook {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [latestText, setLatestText] = useState('');
  const [isMicActive, setIsMicActive] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const entryIdRef = useRef(0);

  // ─── WebSocket connection ─────────────────────────────────────────────────
  useEffect(() => {
    const url = `${WS_BASE}/ws/interview/${sessionId}`;
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
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
            entryIdRef.current += 1;
            const entry: TranscriptEntry = { speaker, text, id: entryIdRef.current };
            setTranscript((prev) => [...prev, entry]);
            if (speaker === 'interviewer') setLatestText(text);
          }
        }
      } catch {
        // non-JSON message – ignore
      }
    };

    socket.onclose = () => {
      console.log('[WS] disconnected');
      setIsConnected(false);
    };

    socket.onerror = (e) => console.error('[WS] error', e);

    return () => {
      socket.close();
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

      // Gemini Live returns 16-bit PCM at 24 kHz
      const ctx = new AudioContext({ sampleRate: 24000 });
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
      source.start();
      source.onended = () => ctx.close();
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

      const source = ctx.createMediaStreamSource(stream);
      // ScriptProcessorNode is deprecated but still the most portable option
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const float32 = e.inputBuffer.getChannelData(0);
        sendAudioChunk(float32);
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      setIsMicActive(true);
    } catch (err) {
      console.error('[Mic] access denied', err);
    }
  }, [isMicActive]);

  const stopMic = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsMicActive(false);
    // Signal end of turn to Gemini
    socketRef.current?.send(JSON.stringify({ type: 'end_of_turn' }));
  }, []);

  // ─── Send helpers ─────────────────────────────────────────────────────────
  const sendAudioChunk = (float32: Float32Array) => {
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
    socket.send(JSON.stringify({ type: 'audio', audio: b64 }));
  };

  const sendAudio = useCallback((pcm: Float32Array) => {
    sendAudioChunk(pcm);
  }, []);

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
  };
}