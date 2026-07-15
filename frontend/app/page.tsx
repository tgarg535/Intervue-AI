'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, FileText, Sparkles, ShieldCheck,
  Zap, ChevronRight, Briefcase, AlertCircle,
} from 'lucide-react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

export default function LandingPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) { setError('Please upload your resume PDF.'); return; }
    if (!jd.trim()) { setError('Please paste the job description.'); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jd', jd);

      const res = await fetch(`${API_BASE}/ingest/`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` })) as { detail: string };
        throw new Error(err.detail);
      }

      const payload = await res.json() as { session_id: string; warnings?: string[] };
      router.push(`/interview?session=${payload.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* Glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-blue-600/10 blur-[120px] rounded-full" />

      <main className="relative max-w-6xl mx-auto px-6 py-24 lg:py-32">

        {/* Hero */}
        <div className="text-center space-y-8 mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black tracking-[0.2em] uppercase">
            <Sparkles size={14} /> Gemini 2.0 · Live Audio · Real-time Analysis
          </div>
          <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-none">
            Master the<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">
              Technical Round
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Upload your resume and paste a job description. Our Gemini-powered interviewer conducts a live technical deep-dive tailored to your experience — then scores you.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleStart}
          className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-900/40 p-8 lg:p-12 rounded-[40px] border border-white/5 backdrop-blur-3xl shadow-2xl"
        >
          {/* Resume Upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-500">
              <FileText size={16} />
              <label className="text-[10px] font-black uppercase tracking-widest">01 · Resume PDF</label>
            </div>

            <label className={`relative group flex flex-col items-center justify-center gap-4 text-center cursor-pointer border-2 border-dashed rounded-3xl p-10 transition-all ${
              file
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-white/10 hover:border-blue-500/40 bg-white/[0.02]'
            }`}>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                file ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
              }`}>
                {file ? <ShieldCheck size={28} /> : <Upload size={28} />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200 truncate max-w-[200px]">
                  {file ? file.name : 'Select Resume PDF'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">
                  {file ? `${(file.size / 1024).toFixed(0)} KB` : 'Click or drag to upload'}
                </p>
              </div>
            </label>
          </div>

          {/* JD Text */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Briefcase size={16} />
              <label className="text-[10px] font-black uppercase tracking-widest">02 · Job Description</label>
            </div>
            <textarea
              placeholder="Paste the full job description here. The more detail, the better-tailored your interview questions will be…"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              className="w-full h-[185px] bg-white/[0.02] border border-white/10 rounded-3xl p-6 focus:outline-none focus:border-blue-500/40 transition-all resize-none text-sm leading-relaxed text-slate-300 placeholder:text-slate-700"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="md:col-span-2 flex items-center gap-3 px-5 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="md:col-span-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full group bg-white text-black hover:bg-blue-50 py-6 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all disabled:opacity-50 flex items-center justify-center gap-4 shadow-[0_0_40px_rgba(255,255,255,0.08)] hover:shadow-blue-500/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Zap size={18} className="fill-current" />
                  Begin Evaluation
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>

          {/* Steps */}
          <div className="md:col-span-2 pt-2 grid grid-cols-3 gap-4 text-center border-t border-white/5">
            {[
              { step: '01', label: 'Upload & Index', desc: 'Resume chunked into pgvector' },
              { step: '02', label: 'Live Interview', desc: 'Audio-to-audio with Gemini 2.0' },
              { step: '03', label: 'Score Report', desc: 'AI-generated detailed feedback' },
            ].map((s) => (
              <div key={s.step} className="pt-6 space-y-1">
                <p className="text-[9px] font-black text-blue-500/50 uppercase tracking-widest">{s.step}</p>
                <p className="text-xs font-bold text-slate-400">{s.label}</p>
                <p className="text-[10px] text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </form>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-12 text-center max-w-4xl mx-auto">
          {[
            { title: 'Gemini 2.0 Live', desc: 'Native audio-to-audio streaming — zero typing required.' },
            { title: 'RAG-Tailored', desc: 'Questions generated from your actual project history.' },
            { title: 'Biometric Insight', desc: 'Posture & sentiment tracked via MediaPipe on-device.' },
          ].map((f) => (
            <div key={f.title} className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}