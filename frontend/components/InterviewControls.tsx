import React from 'react';
import { Mic, MicOff, LogOut, Video, VideoOff } from 'lucide-react';

interface InterviewControlsProps {
  isMicOn: boolean;
  setIsMicOn: (value: boolean) => void;
  isCamOn: boolean;
  setIsCamOn: (value: boolean) => void;
  onEndSession: () => void;
}

/**
 * InterviewControls Component
 * Handles the user interactions for the mic and camera toggles and ending the session.
 */
const InterviewControls: React.FC<InterviewControlsProps> = ({
  isMicOn,
  setIsMicOn,
  isCamOn,
  setIsCamOn,
  onEndSession
}) => {
  return (
    <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
      
      {/* Microphone Toggle */}
      <button 
        onClick={() => setIsMicOn(!isMicOn)}
        className={`p-3 rounded-xl transition-all duration-200 group relative ${
          isMicOn 
          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' 
          : 'bg-red-500/20 text-red-500 border border-red-500/50'
        }`}
        title={isMicOn ? "Mute Mic" : "Unmute Mic"}
      >
        {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase font-bold tracking-tighter">
          Mic {isMicOn ? 'On' : 'Off'}
        </span>
      </button>

      {/* Camera Toggle */}
      <button 
        onClick={() => setIsCamOn(!isCamOn)}
        className={`p-3 rounded-xl transition-all duration-200 group relative ${
          isCamOn 
          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' 
          : 'bg-red-500/20 text-red-500 border border-red-500/50'
        }`}
        title={isCamOn ? "Stop Video" : "Start Video"}
      >
        {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase font-bold tracking-tighter">
          Cam {isCamOn ? 'On' : 'Off'}
        </span>
      </button>

      {/* Vertical Divider */}
      <div className="w-[1px] h-8 bg-white/10 mx-2" />

      {/* End Session Button */}
      <button 
        onClick={onEndSession}
        className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]"
      >
        <LogOut size={16} />
        End Interview
      </button>
    </div>
  );
};

export default InterviewControls;