import React, { useRef, useEffect } from 'react';
import { useMediaPipe } from '../hooks/useMediaPipe';

const WebcamFeed = () => {
  // use non-null assertion so the ref type matches useMediaPipe's expected RefObject<HTMLVideoElement>
  const videoRef = useRef<HTMLVideoElement>(null!);
  const { posture, sentiment, runDetection } = useMediaPipe(videoRef);

  useEffect(() => {
    // Start the camera 
    const startVideo = async () => {
      if (navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    };

    startVideo();

    // Run AI detection loop at 30fps 
    const interval = setInterval(() => {
      runDetection();
    }, 33);

    return () => clearInterval(interval);
  }, [runDetection]);

  return (
    <div className="relative w-full max-w-2xl bg-black rounded-lg overflow-hidden">
      {/* 1. The Live Video Feed  */}
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />

      {/* 2. Posture Bar (Flowchart: Good/Bad meter)  */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        <span className="text-white text-xs font-bold uppercase">Posture</span>
        <div className={`w-32 h-4 rounded-full border-2 border-white overflow-hidden`}>
          <div 
            className={`h-full transition-all duration-300 ${posture === 'good' ? 'bg-green-500 w-full' : 'bg-red-500 w-1/3'}`} 
          />
        </div>
      </div>

      {/* 3. Sentiment Bar (Flowchart: Calm -> Anxious)  */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <span className="text-white text-xs font-bold uppercase">Sentiment</span>
        <div className={`w-48 h-4 rounded-full border-2 border-white overflow-hidden bg-gray-800`}>
          <div 
            className={`h-full transition-all duration-500 ${sentiment === 'calm' ? 'bg-blue-400 w-1/4' : 'bg-orange-500 w-3/4'}`} 
          />
        </div>
      </div>
    </div>
  );
};

export default WebcamFeed;