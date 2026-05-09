'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useMediaPipe } from '../hooks/useMediaPipe';

type Posture = 'good' | 'bad' | 'detecting';
type Mood = 'calm' | 'anxious' | 'detecting';

interface WebcamFeedProps {
  onSentimentChange?: (sentiment: Mood) => void;
}

const WebcamFeed: React.FC<WebcamFeedProps> = ({ onSentimentChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [posture, setPosture] = useState<Posture>('detecting');
  const [mood, setMood] = useState<Mood>('detecting');
  const [cameraError, setCameraError] = useState(false);
  const { posture: detectedPosture, sentiment, runDetection } = useMediaPipe(videoRef);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        interval = setInterval(() => {
          runDetection();
        }, 2000);
      } catch {
        setCameraError(true);
      }
    };

    void start();

    return () => {
      stream?.getTracks().forEach(t => t.stop());
      if (interval) clearInterval(interval);
    };
  }, [runDetection]);

  useEffect(() => {
    setPosture(detectedPosture);
    setMood(sentiment);
  }, [detectedPosture, sentiment]);

  useEffect(() => {
    if (!onSentimentChange) return;
    onSentimentChange(mood);
  }, [mood, onSentimentChange]);

  if (cameraError) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Camera unavailable</p>
        <p className="text-slate-600 text-[10px]">Grant camera access to enable posture tracking</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/5">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* Posture Badge */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
        <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Posture</span>
        <div className="w-28 h-2.5 rounded-full bg-white/10 overflow-hidden border border-white/10">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              posture === 'good' ? 'w-full bg-emerald-500' :
              posture === 'bad'  ? 'w-1/3 bg-red-500' :
              'w-1/2 bg-slate-600 animate-pulse'
            }`}
          />
        </div>
        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
          {posture === 'detecting' ? '…' : posture}
        </span>
      </div>

      {/* Sentiment Badge */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5">
        <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Sentiment</span>
        <div className="w-40 h-2.5 rounded-full bg-white/10 overflow-hidden border border-white/10">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              mood === 'calm'      ? 'w-1/4 bg-blue-400' :
              mood === 'anxious'  ? 'w-3/4 bg-orange-500' :
              'w-1/2 bg-slate-600 animate-pulse'
            }`}
          />
        </div>
        <div className="flex justify-between w-40">
          <span className="text-[8px] text-blue-400 font-bold uppercase">Calm</span>
          <span className="text-[8px] text-orange-400 font-bold uppercase">Anxious</span>
        </div>
      </div>
    </div>
  );
};

export default WebcamFeed;