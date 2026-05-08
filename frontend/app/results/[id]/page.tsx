'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  TrendingUp, 
  Target, 
  Award, 
  ArrowLeft, 
  BrainCircuit,
  MessageSquareQuote
} from 'lucide-react';

// Interface matching the backend Gemini 3.1 Flash Lite output
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

export default function ResultsPage() {
  const { id: sessionId } = useParams();
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        // TODO: Fetch from backend API when reports endpoint is available
        // For now, show a placeholder
        setReport({
          communication_score: 0,
          technical_score: 0,
          confidence_score: 0,
          eye_contact_score: 0,
          pace_score: 0,
          overall_summary: "Interview completed. Detailed analysis will be available soon.",
          feedback_cards: []
        });
      } catch (err) {
        console.error("Error fetching report:", err);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) fetchReport();
  }, [sessionId]);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6 text-white font-sans">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <BrainCircuit className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={24} />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">Analyzing Performance</h2>
        <p className="text-xs text-slate-500">Gemini is synthesizing your technical accuracy and communication style...</p>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 p-8 lg:p-12 max-w-7xl mx-auto selection:bg-blue-500/30">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
        <div>
          <button 
            onClick={() => router.push('/')} 
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest mb-4 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
            Exit to Dashboard
          </button>
          <h1 className="text-5xl font-black tracking-tighter text-white">
            Interview <span className="text-blue-500">Insights</span>
          </h1>
        </div>
        
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
            <Award size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70">Candidate Status</p>
            <p className="text-sm font-bold text-emerald-400">Recommended for Hire</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">
        
        {/* --- LEFT: OVERALL & FEEDBACK (8 COLS) --- */}
        <div className="col-span-12 lg:col-span-8 space-y-12">
          
          {/* Executive Summary */}
          <section className="relative p-8 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl">
              <CheckCircle2 size={20} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-8">Executive Summary</h2>
            <p className="text-lg text-slate-300 leading-relaxed font-medium italic">
              "{report?.overall_summary || "Our AI is still finalizing your summary. Check back in a moment."}"
            </p>
          </section>

          {/* Feedback Cards Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquareQuote className="text-blue-500" size={20} />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Technical Deep Dive</h2>
            </div>
            
            {report?.feedback_cards.map((card, index) => (
              <div key={index} className="group bg-slate-900/20 hover:bg-slate-900/40 border border-white/5 p-8 rounded-3xl transition-all duration-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <h3 className="text-lg font-bold text-white flex-1">
                    <span className="text-blue-500 mr-2 text-sm font-black italic">Q{index + 1}.</span> 
                    {card.question}
                  </h3>
                  <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">
                      Accuracy: {card.technical_accuracy}/10
                    </span>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Your Answer</p>
                    <p className="text-sm text-slate-400 font-mono italic">"{card.user_answer}"</p>
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

        {/* --- RIGHT: SKILL MATRIX (4 COLS) --- */}
        <div className="col-span-12 lg:col-span-4">
          <div className="sticky top-12 bg-slate-900/60 rounded-[40px] p-10 border border-white/10 shadow-3xl backdrop-blur-2xl">
            <div className="text-center mb-10">
              <Target className="mx-auto text-blue-500 mb-4" size={32} />
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Skill Matrix</h2>
            </div>
            
            <div className="space-y-8">
              {[
                { label: 'Technical Accuracy', val: report?.technical_score, color: 'bg-blue-500' },
                { label: 'Communication', val: report?.communication_score, color: 'bg-emerald-400' },
                { label: 'Confidence', val: report?.confidence_score, color: 'bg-indigo-500' },
                { label: 'Eye Contact', val: report?.eye_contact_score, color: 'bg-orange-400' },
                { label: 'Speaking Pace', val: report?.pace_score, color: 'bg-pink-500' },
              ].map((skill) => (
                <div key={skill.label} className="group">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">
                      {skill.label}
                    </span>
                    <span className="text-sm font-black text-white">{skill.val || 0}/10</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${skill.color} transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.1)]`} 
                      style={{ width: `${(skill.val || 0) * 10}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-white/5">
              <div className="flex items-center gap-3 text-slate-500 mb-4">
                <TrendingUp size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Growth Trajectory</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Based on this session, focus on articulating system design trade-offs more clearly to increase your technical score.
              </p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}