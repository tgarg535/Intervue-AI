'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, Cpu, Terminal as TerminalIcon } from 'lucide-react';

// Components
import WebcamFeed from '../../components/WebcamFeed';
import LiveAudioVisualizer from '../../components/LiveAudioVisualizer';
import InterviewControls from '../../components/InterviewControls';

// Hooks
import { useWebsocket } from '../../hooks/useWebsocket';

/**
 * The main Interview Room component.
 * Uses a grid layout to show video, audio analytics, and live transcription.
 */
function InterviewContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session') || 'active-session';
  
  // UI States
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  // Connect to the Backend WebSocket
  const { isConnected, transcript } = useWebsocket(sessionId);

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-slate-200 overflow-hidden">
      
      {/* --- HEADER --- */}
      <header className="flex justify-between items-center px-8 py-4 bg-slate-900/40 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            <Cpu className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">AI Technical Assessment</h1>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                {isConnected ? 'System Online' : 'Connecting to Gemini...'}
              </p>
            </div>
          </div>
        </div>

        <InterviewControls 
          isMicOn={isMicOn} 
          setIsMicOn={setIsMicOn}
          isCamOn={isCamOn}
          setIsCamOn={setIsCamOn}
          onEndSession={() => window.location.href = `/results/${sessionId}`}
        />
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">
        
        {/* Left Section: Video & Audio Analytics (8 Columns) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Webcam Layer */}
          <div className="relative group">
            <WebcamFeed />
            {!isCamOn && (
              <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center rounded-2xl border-4 border-slate-800">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Cpu className="text-slate-600" size={32} />
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Camera Feed Disabled</p>
              </div>
            )}
          </div>

          {/* Audio Analytics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LiveAudioVisualizer />
            
            <div className="bg-slate-900/30 rounded-2xl border border-white/5 p-6 flex flex-col justify-center gap-4">
              <div className="flex items-center gap-2 text-blue-400">
                <MessageSquare size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">System Instruction</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed italic">
                "The interviewer is currently listening to your approach. Try to break down the problem into smaller steps while maintaining eye contact with the lens."
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Terminal Style Transcription (4 Columns) */}
        <div className="col-span-12 lg:col-span-4 bg-[#0a0f1e] rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <TerminalIcon size={14} className="text-blue-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Intel</h2>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500/50" />
              <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
              <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6 font-mono text-sm">
            {transcript ? (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-bold">GEMINI</span>
                  <span className="text-[10px] text-slate-600">JUST NOW</span>
                </div>
                <p className="text-slate-300 leading-relaxed border-l-2 border-blue-500/30 pl-4 py-1">
                  {transcript}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-700">
                <div className="w-8 h-8 border border-dashed border-slate-700 rounded-full animate-spin" />
                <p className="text-[9px] uppercase font-black tracking-widest">Awaiting AI Output</p>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-4 bg-blue-600/5 border-t border-blue-500/10">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-blue-500/50 uppercase">Protocol 2.0-Flash</span>
              <span className="text-[9px] font-bold text-blue-500/50 uppercase tracking-tighter">Real-time Stream</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

/**
 * Next.js page wrapper with Suspense for useSearchParams
 */
export default function InterviewPage() {
  return (
    <Suspense fallback={<div>Loading Workspace...</div>}>
      <InterviewContent />
    </Suspense>
  );
}