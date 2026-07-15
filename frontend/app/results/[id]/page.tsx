'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle2, TrendingUp, Target, Award, ArrowLeft,
  BrainCircuit, MessageSquareQuote, AlertCircle,
} from 'lucide-react';

interface ReportData {
  communication_score: number;
  technical_score: number;
  confidence_score: number;
  eye_contact_score: number;
  pace_score: number;
  overall_summary: string;
  feedback_cards: Array<{
    question: string;
    user_answer: string;
    feedback: string;
    technical_accuracy: number;
  }>;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

export default function ResultsPage() {
  const params = useParams();
  const sessionId = Array.isArray(params['id']) ? params['id'][0] : (params['id'] ?? '');
  const router = useRouter();

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchReport = async () => {
      try {
        const res = await fetch(`${API_BASE}/report/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error((err as { detail: string }).detail ?? `HTTP ${res.status}`);
        }

        const data = await res.json() as ReportData;
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [sessionId]);

  // ── Avg score helper ──────────────────────────────────────────────────────
  const avgScore = report
    ? Math.round(
        (report.communication_score +
          report.technical_score +
          report.confidence_score +
          report.eye_contact_score +
          report.pace_score) /
          5,
      )
    : 0;

  const scoreLabel = avgScore >= 8 ? 'Recommended for Hire' : avgScore >= 5 ? 'Potential Candidate' : 'Needs Improvement';
  const scoreBadgeColor = avgScore >= 8 ? 'emerald' : avgScore >= 5 ? 'yellow' : 'red';
  const scoreBadgeClasses = {
    emerald: {
      container: 'bg-emerald-500/10 border border-emerald-500/20',
      icon: 'w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400',
      label: 'text-[10px] font-black uppercase tracking-widest text-emerald-500/70',
      status: 'text-sm font-bold text-emerald-400',
      value: 'text-xl font-black text-emerald-300',
    },
    yellow: {
      container: 'bg-yellow-500/10 border border-yellow-500/20',
      icon: 'w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-400',
      label: 'text-[10px] font-black uppercase tracking-widest text-yellow-500/70',
      status: 'text-sm font-bold text-yellow-400',
      value: 'text-xl font-black text-yellow-300',
    },
    red: {
      container: 'bg-red-500/10 border border-red-500/20',
      icon: 'w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-red-400',
      label: 'text-[10px] font-black uppercase tracking-widest text-red-500/70',
      status: 'text-sm font-bold text-red-400',
      value: 'text-xl font-black text-red-300',
    },
  } as const;
  const scoreStyles = scoreBadgeClasses[scoreBadgeColor];

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6 text-white">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <BrainCircuit className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={24} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">Analysing Performance</h2>
          <p className="text-xs text-slate-500">Gemini is synthesising your technical accuracy…</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6 text-white p-8">
        <AlertCircle className="text-red-400" size={48} />
        <h2 className="text-lg font-black">Report Unavailable</h2>
        <p className="text-slate-400 text-center max-w-md text-sm">{error ?? 'No report data returned.'}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold transition-all"
        >
          Return Home
        </button>
      </div>
    );
  }

  // ── Report ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 p-8 lg:p-12 max-w-7xl mx-auto selection:bg-blue-500/30">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
        <div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest mb-4 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            New Interview
          </button>
          <h1 className="text-5xl font-black tracking-tighter text-white">
            Interview <span className="text-blue-500">Insights</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2">Session ID: {sessionId}</p>
        </div>

        <div className={`${scoreStyles.container} rounded-2xl p-4 flex items-center gap-4`}>
          <div className={scoreStyles.icon}>
            <Award size={28} />
          </div>
          <div>
            <p className={scoreStyles.label}>Candidate Status</p>
            <p className={scoreStyles.status}>{scoreLabel}</p>
            <p className={scoreStyles.value}>{avgScore}/10</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">

        {/* Left: Summary + Feedback */}
        <div className="col-span-12 lg:col-span-8 space-y-10">

          {/* Executive Summary */}
          <section className="relative p-8 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl">
              <CheckCircle2 size={20} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-8">Executive Summary</h2>
            <p className="text-lg text-slate-300 leading-relaxed font-medium italic">
              &ldquo;{report.overall_summary}&rdquo;
            </p>
          </section>

          {/* Feedback Cards */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <MessageSquareQuote className="text-blue-500" size={20} />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Technical Deep Dive</h2>
            </div>

            {report.feedback_cards.length === 0 && (
              <div className="p-8 rounded-3xl bg-slate-900/20 border border-white/5 text-center">
                <p className="text-slate-500 text-sm">No per-question feedback available for this session.</p>
              </div>
            )}

            {report.feedback_cards.map((card, index) => (
              <div key={index} className="group bg-slate-900/20 hover:bg-slate-900/40 border border-white/5 p-8 rounded-3xl transition-all duration-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <h3 className="text-base font-bold text-white flex-1">
                    <span className="text-blue-500 mr-2 text-sm font-black italic">Q{index + 1}.</span>
                    {card.question}
                  </h3>
                  <AccuracyBadge score={card.technical_accuracy} />
                </div>
                <div className="grid gap-4">
                  <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Your Answer</p>
                    <p className="text-sm text-slate-400 font-mono italic">&ldquo;{card.user_answer}&rdquo;</p>
                  </div>
                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 mb-2">AI Feedback</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{card.feedback}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Right: Skill Matrix */}
        <div className="col-span-12 lg:col-span-4">
          <div className="sticky top-12 bg-slate-900/60 rounded-[40px] p-10 border border-white/10 backdrop-blur-2xl">
            <div className="text-center mb-10">
              <Target className="mx-auto text-blue-500 mb-4" size={32} />
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Skill Matrix</h2>
            </div>

            <div className="space-y-7">
              {([
                { label: 'Technical Accuracy', val: report.technical_score, color: 'bg-blue-500', shadow: 'shadow-blue-500/30' },
                { label: 'Communication', val: report.communication_score, color: 'bg-emerald-400', shadow: 'shadow-emerald-400/30' },
                { label: 'Confidence', val: report.confidence_score, color: 'bg-indigo-500', shadow: 'shadow-indigo-500/30' },
                { label: 'Eye Contact', val: report.eye_contact_score, color: 'bg-orange-400', shadow: 'shadow-orange-400/30' },
                { label: 'Speaking Pace', val: report.pace_score, color: 'bg-pink-500', shadow: 'shadow-pink-500/30' },
              ] as const).map((skill) => (
                <div key={skill.label} className="group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">
                      {skill.label}
                    </span>
                    <span className="text-sm font-black text-white">{skill.val}/10</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${skill.color} transition-all duration-1000 ease-out shadow-lg ${skill.shadow}`}
                      style={{ width: `${skill.val * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-white/5">
              <div className="flex items-center gap-3 text-slate-500 mb-3">
                <TrendingUp size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Growth Trajectory</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Focus on the lowest-scoring dimension above to make the biggest impact in your next interview.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function AccuracyBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    : score >= 5 ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
    : 'bg-red-500/10 border-red-500/20 text-red-400';
  return (
    <div className={`px-4 py-1.5 border rounded-full ${color}`}>
      <span className="text-[10px] font-black uppercase tracking-tighter">
        Accuracy: {score}/10
      </span>
    </div>
  );
}