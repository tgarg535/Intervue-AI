'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';

const BAR_COUNT = 40;

interface LiveAudioVisualizerProps {
  micLevel: number;
  pace: number;
  pitch: number;
  active: boolean;
}

const LiveAudioVisualizer: React.FC<LiveAudioVisualizerProps> = ({ micLevel, pace, pitch, active }) => {
  const [bars, setBars] = useState<number[]>(new Array(BAR_COUNT).fill(2) as number[]);
  const phaseRef = useRef(0);

  useEffect(() => {
    phaseRef.current += 0.2;
    const nextBars = new Array(BAR_COUNT).fill(2).map((_, i) => {
      const wave = Math.sin(phaseRef.current + i * 0.4) * 8 + 12;
      return Math.max(2, Math.min(100, wave + micLevel));
    });
    setBars(nextBars);
  }, [micLevel]);

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