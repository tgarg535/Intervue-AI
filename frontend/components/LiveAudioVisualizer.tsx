import React, { useEffect, useRef, useState } from 'react';

/**
 * LiveAudioVisualizer Component
 * Handles the "Pitch Bar" and "Pace Bar" using the Web Audio API.
 */
const LiveAudioVisualizer: React.FC = () => {
  const [pitch, setPitch] = useState(0); // 0 to 100
  const [pace, setPace] = useState(0);   // 0 to 100
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const startAudio = async () => {
      try {
        // 1. Request Microphone Access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // 2. Setup Web Audio API
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 2048;
        source.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

        // 3. Start Analysis Loop
        analyze();
      } catch (err) {
        console.error("Microphone access denied for visualizer:", err);
      }
    };

const analyze = () => {
      // 1. Capture the current values in local variables
      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;

      // 2. Strong null check: If either is missing, stop the loop
      if (!analyser || !dataArray) return;

      // 3. Now passing 'dataArray' (a local variable) clears the red line 
      // because TS knows it cannot be null at this point.
      analyser.getByteFrequencyData(dataArray);
      
      // --- PITCH CALCULATION ---
      let maxVal = 0;
      let maxIndex = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i];
        if (value !== undefined && value > maxVal) {
          maxVal = value;
          maxIndex = i;
        }
      }
      
      const normalizedPitch = Math.min(100, (maxIndex / 50) * 100);
      setPitch(normalizedPitch);

      // --- PACE CALCULATION ---
      const averageAmplitude = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setPace((prev) => (prev * 0.9) + (averageAmplitude * 0.1));

      animationRef.current = requestAnimationFrame(analyze);
    };

    startAudio();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 w-full max-w-md">
      
      {/* PITCH BAR (Flowchart: Pitch Analysis) */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">Voice Pitch</span>
          <span className="text-[10px] text-blue-400 font-bold">{pitch > 70 ? 'HIGH' : pitch < 30 ? 'LOW' : 'STABLE'}</span>
        </div>
        <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-150 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
            style={{ width: `${pitch}%` }} 
          />
        </div>
      </div>

      {/* PACE BAR (Flowchart: Pace Analysis) */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">Speaking Pace</span>
          <span className="text-[10px] text-emerald-400 font-bold">{pace > 40 ? 'ACTIVE' : 'SILENT'}</span>
        </div>
        <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
            style={{ width: `${pace * 2}%` }} 
          />
        </div>
      </div>

      <div className="pt-2 border-t border-white/5">
        <p className="text-[9px] text-white/30 text-center italic">Live Audio Processing (Web Audio API)</p>
      </div>
    </div>
  );
};

export default LiveAudioVisualizer;