'use client';

import React, { useState, Suspense, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Cpu, Terminal as TerminalIcon, Mic, MicOff, Video, VideoOff, LogOut, User, Bot } from 'lucide-react';

import WebcamFeed from '../../components/WebcamFeed';
import LiveAudioVisualizer from '../../components/LiveAudioVisualizer';
import { useWebsocket } from '../../hooks/useWebsocket';

function InterviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session') ?? '';

  const [isCamOn, setIsCamOn] = useState(true);
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  const {
    isConnected,
    transcript,
    startMic,
    stopMic,
    isMicActive,
    setLocalSentiment,
    audioPace,
    audioPitch,
    micLevel,
  } = useWebsocket(sessionId);

  useEffect(() => {
    if (!sessionId) router.replace('/');
  }, [router, sessionId]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const toggleMic = async () => {
    if (isMicActive) {
      stopMic();
    } else {
      await startMic();
    }
  };

  const endSession = () => {
    stopMic();
    router.push(`/results/${sessionId}`);
  };

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-slate-200 overflow-hidden">

      {/* ── HEADER ── */}
      <header className="flex justify-between items-center px-8 py-4 bg-slate-900/40 border-b border-white/5 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            <Cpu className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">AI Technical Assessment</h1>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                {isConnected ? 'System Online' : 'Connecting…'}
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
          <button
            onClick={toggleMic}
            className={`p-3 rounded-xl transition-all ${
              isMicActive
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title={isMicActive ? 'Stop speaking' : 'Start speaking'}
          >
            {isMicActive ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            onClick={() => setIsCamOn((v) => !v)}
            className={`p-3 rounded-xl transition-all ${
              isCamOn ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-red-500/20 text-red-500 border border-red-500/50'
            }`}
          >
            {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <div className="w-px h-8 bg-white/10 mx-1" />

          <button
            onClick={endSession}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]"
          >
            <LogOut size={16} /> End Interview
          </button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden min-h-0">

        {/* Left: Video + Audio Visualizer */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-1 custom-scrollbar">
          <div className="relative group rounded-2xl overflow-hidden border border-white/5">
            {isCamOn ? (
              <WebcamFeed onSentimentChange={(value) => {
                if (value === 'detecting') return;
                setLocalSentiment(value);
              }} />
            ) : (
              <div className="w-full aspect-video bg-slate-900 flex flex-col items-center justify-center rounded-2xl border border-slate-800">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Cpu className="text-slate-600" size={32} />
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Camera Disabled</p>
              </div>
            )}

            {/* Mic status overlay */}
            {isMicActive && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-blue-600/90 backdrop-blur px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Live</span>
              </div>
            )}
          </div>

          <LiveAudioVisualizer
            active={isMicActive}
            micLevel={micLevel}
            pace={audioPace}
            pitch={audioPitch}
          />

          {/* Tip card */}
          <div className="bg-slate-900/30 rounded-2xl border border-white/5 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Tip</p>
            <p className="text-sm text-slate-400 leading-relaxed italic">
              Press the microphone button to start speaking. Release it when you&apos;re done — Gemini will respond in real time.
            </p>
          </div>
        </div>

        {/* Right: Live transcript terminal */}
        <div className="col-span-12 lg:col-span-4 bg-[#0a0f1e] rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl min-h-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-2">
              <TerminalIcon size={14} className="text-blue-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Transcript</h2>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500/50" />
              <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
              <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-sm custom-scrollbar min-h-0">
            {transcript.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-700">
                <div className="w-8 h-8 border border-dashed border-slate-700 rounded-full animate-spin" />
                <p className="text-[9px] uppercase font-black tracking-widest text-center">
                  {isConnected ? 'Waiting for AI…' : 'Connecting…'}
                </p>
              </div>
            ) : (
              transcript.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                    entry.speaker === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                    entry.speaker === 'interviewer' ? 'bg-blue-600' : 'bg-slate-700'
                  }`}>
                    {entry.speaker === 'interviewer'
                      ? <Bot size={12} className="text-white" />
                      : <User size={12} className="text-slate-300" />
                    }
                  </div>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    entry.speaker === 'interviewer'
                      ? 'bg-blue-600/10 border border-blue-500/20 text-slate-300 rounded-tl-sm'
                      : 'bg-slate-800/60 border border-white/5 text-slate-400 rounded-tr-sm'
                  }`}>
                    {entry.text}
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptBottomRef} />
          </div>

          <div className="p-4 bg-blue-600/5 border-t border-blue-500/10 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-blue-500/50 uppercase">Gemini 2.0 Flash Live</span>
              <span className="text-[9px] font-bold text-blue-500/50 uppercase">{transcript.length} turns</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">
        Loading workspace…
      </div>
    }>
      <InterviewContent />
    </Suspense>
  );
}