'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';

const BAR_COUNT = 40;

const LiveAudioVisualizer: React.FC = () => {
  const [bars, setBars] = useState<number[]>(new Array(BAR_COUNT).fill(2) as number[]);
  const [pitch, setPitch] = useState(0);
  const [pace, setPace] = useState(0);
  const [active, setActive] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number | undefined>(undefined);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

        const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;

        src.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        dataRef.current = new Uint8Array(analyser.frequencyBinCount);
        setActive(true);
        tick();
      } catch {
        // mic denied – visualiser stays dormant
      }
    };

    const tick = () => {
      const analyser = analyserRef.current;
      const data = dataRef.current;
      if (!analyser || !data) return;

      analyser.getByteFrequencyData(data);

      // Bars (take first BAR_COUNT bins)
      const newBars: number[] = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        const val = data[i] ?? 0;
        newBars.push(Math.max(2, (val / 255) * 100));
      }
      setBars(newBars);

      // Pitch: index of loudest bin
      let maxVal = 0, maxIdx = 0;
      for (let i = 0; i < data.length; i++) {
        if ((data[i] ?? 0) > maxVal) { maxVal = data[i]!; maxIdx = i; }
      }
      setPitch(Math.min(100, (maxIdx / data.length) * 200));

      // Pace: average amplitude
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setPace(prev => prev * 0.85 + avg * 0.15);

      animRef.current = requestAnimationFrame(tick);
    };

    void init();

    return () => {
      mounted = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      audioCtxRef.current?.close();
    };
  }, []);

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 space-y-5 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-400">
          <Activity size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Audio Analysis</span>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
          active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-600'
        }`}>
          {active ? 'Live' : 'No Mic'}
        </span>
      </div>

      {/* Waveform bars */}
      <div className="flex items-end gap-[2px] h-16">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-all duration-75"
            style={{
              height: `${h}%`,
              background: `hsl(${220 + i * 2}, 80%, ${50 + h * 0.2}%)`,
              opacity: active ? 1 : 0.2,
            }}
          />
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Meter label="Voice Pitch" value={pitch} tag={pitch > 70 ? 'HIGH' : pitch < 30 ? 'LOW' : 'STABLE'} color="bg-blue-500" />
        <Meter label="Speaking Pace" value={Math.min(100, pace * 2)} tag={pace > 20 ? 'ACTIVE' : 'SILENT'} color="bg-emerald-500" />
      </div>
    </div>
  );
};

function Meter({ label, value, tag, color }: { label: string; value: number; tag: string; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
        <span className="text-[9px] font-bold text-slate-400">{tag}</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-150 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default LiveAudioVisualizer;