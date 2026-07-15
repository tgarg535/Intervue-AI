<div align="center">

```
 ██╗███╗   ██╗████████╗███████╗██████╗ ██╗   ██╗██╗   ██╗███████╗  █████╗ ██╗
 ██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗██║   ██║██║   ██║██╔════╝ ██╔══██╗██║
 ██║██╔██╗ ██║   ██║   █████╗  ██████╔╝██║   ██║██║   ██║█████╗   ███████║██║
 ██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗╚██╗ ██╔╝██║   ██║██╔══╝   ██╔══██║██║
 ██║██║ ╚████║   ██║   ███████╗██║  ██║ ╚████╔╝ ╚██████╔╝███████╗ ██║  ██║██║
 ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝  ╚═══╝   ╚═════╝ ╚══════╝ ╚═╝  ╚═╝╚═╝
```

### *AI-powered mock interviews with live audio, RAG-enhanced context & real-time feedback*

<br/>

## 🚀 LIVE PROJECT

### 👉 **[https://intervue-ai-navy.vercel.app/](https://intervue-ai-navy.vercel.app/)**

<br/>

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/Gemini_3.1_Flash-Live-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Orchestrator-FF6B35?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![pgvector](https://img.shields.io/badge/pgvector-RAG-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)

<br/>

</div>

---

## ✨ What is Intervue AI?

**Intervue AI** is a full-stack, real-time interview simulation platform that conducts intelligent mock interviews tailored to your resume and job description. It uses:

- 🎙️ **Gemini 3.1 Flash Live** for low-latency, voice-driven conversations
- 🧠 **LangGraph** to orchestrate adaptive interview flows that respond to your answer quality
- 📄 **RAG (pgvector)** to deeply understand your resume and job description
- 📊 **Client-side AI** (MediaPipe + Web Audio) for posture, sentiment, and filler-word detection
- 📝 **Gemini Flash Lite** with structured JSON scoring to generate detailed post-interview reports

---

## 🗺️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER  (Browser)                                   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                 ┌──────────────────▼──────────────────┐
                 │        Frontend — Next.js / React    │
                 │                                      │
                 │  ┌──────────────┐  ┌──────────────┐ │
                 │  │  Upload Page │  │Interview Page│ │
                 │  │ PDF resume + │  │ Webcam · Mic │ │
                 │  │    Job Desc  │  │  Live Bars   │ │
                 │  └──────┬───────┘  └──────┬───────┘ │
                 │         │                 │         │
                 │  ┌──────▼─────────────────▼───────┐ │
                 │  │     Client-side AI (CPU only)   │ │
                 │  │  MediaPipe — pose + face mesh   │ │
                 │  │  Web Audio API — pitch / pace   │ │
                 │  │  Filler word detection (NLP)    │ │
                 │  └─────────────────────────────────┘ │
                 └──────┬─────────────────────┬──────────┘
                        │  REST / WebSocket   │
         ┌──────────────▼─────────────────────▼──────────────┐
         │              Backend — FastAPI (Python)            │
         │                                                    │
         │  ┌──────────────┐  ┌───────────────────────────┐  │
         │  │ RAG Ingestor │  │  LangGraph Interviewer     │  │
         │  │ PyMuPDF →    │  │  Orchestrator              │  │
         │  │ chunk PDF    │  │  greet → tech_q →          │  │
         │  │ embed →      │  │  followup → hr_q → wrap    │  │
         │  │ pgvector     │  │  (adaptive difficulty)     │  │
         │  └──────────────┘  └───────────────┬───────────┘  │
         │  ┌─────────────────────────────┐   │              │
         │  │      Session Manager        │   │              │
         │  │  store transcript chunks    │   │              │
         │  │  tag rows with sentiment    │   │              │
         │  └─────────────────────────────┘   │              │
         │  ┌─────────────────────────────┐   │              │
         │  │      Report Generator       │◄──┘              │
         │  │  fetches full session       │                  │
         │  │  Flash Lite + thinking      │                  │
         │  └─────────────────────────────┘                  │
         └───────┬────────────────────────────┬──────────────┘
                 │                            │
    ┌────────────▼──────────┐   ┌─────────────▼──────────────┐
    │  Gemini 2.0 Flash     │   │    Supabase                │
    │  Live API             │   │                            │
    │  ─────────────────    │   │  Storage — PDF + JD files  │
    │  Setup: PDF + JD +    │   │  Postgres — sessions,      │
    │  role prompt          │   │  transcripts, sentiment     │
    │  Input: PCM stream +  │   │  tags, final reports       │
    │  sentiment injections │   │  pgvector — embeddings     │
    │  Output: audio +      │   └────────────────────────────┘
    │  transcription text   │
    └───────────────────────┘
    ┌────────────────────────────────────────┐
    │  Gemini Flash Lite — Report Generator  │
    │  thinking_level = "high"               │
    │  Structured JSON via Pydantic schema   │
    │  Scores: communication · technical ·   │
    │  confidence · eye contact · pace       │
    └────────────────────────────────────────┘
```

---

## 🔄 Data Flow

```
1. User uploads PDF resume + Job Description
        │
        ▼
2. Files stored in Supabase Storage
   Resume chunked → embedded → pgvector (RAG index built)
        │
        ▼
3. User opens Interview Window
   Frontend opens WebSocket → /ws/interview
        │
        ▼
4. LangGraph Orchestrator starts session
   State: { difficulty, topic, answer_quality, sentiment_tags }
   Nodes: greet → tech_q → followup → hr_q → wrap
   Conditional edges adapt difficulty per response quality
        │
        ▼
5. Gemini 2.0 Flash Live streams audio conversation
   Input:  PCM audio + real-time sentiment tag injections
   Output: audio response + output_transcription text
        │
        ▼
6. Client-side AI runs in parallel (no server round-trip)
   MediaPipe → posture bar, eye contact tracking
   Web Audio API → pitch, pace, filler-word detection
        │
        ▼
7. Session ends → Report Generator fires
   Fetches full transcript + sentiment tags from Postgres
   Sends to Gemini Flash Lite (thinking_level="high")
   Returns structured JSON scores via Pydantic schema
        │
        ▼
8. Results Page renders
   Scores · Full transcript · Per-question feedback cards
```

---

## 🧩 Project Structure

```
intervue-ai/
├── frontend/                          # Next.js / React app
│   ├── app/
│   │   ├── page.tsx                   # Landing / Upload page
│   │   ├── interview/
│   │   │   └── page.tsx               # Live interview window
│   │   └── results/[id]/
│   │       └── page.tsx               # Results & scoring page
│   ├── components/
│   │   ├── WebcamFeed.tsx             # Webcam capture & display
│   │   └── LiveAudioVisualizer.tsx    # Real-time audio bars
│   ├── hooks/
│   │   ├── useWebsocket.ts            # WebSocket connection manager
│   │   └── useMediaPipe.ts            # Pose / face mesh utilities
│   └── public/
│       └── audio-capture-worklet.js   # AudioWorklet for PCM capture
│
├── backend/                           # FastAPI (Python)
│   ├── main.py                        # App entry, router mounts
│   ├── routers/
│   │   ├── ingest.py                  # PDF / JD upload & RAG ingest
│   │   ├── report.py                  # Report fetch endpoints
│   │   └── websocket.py              # Live interview WebSocket
│   └── services/
│       ├── gemini_live_service.py     # Gemini Live audio streaming
│       ├── langgraph_agent.py         # LangGraph interview orchestrator
│       ├── rag_service.py             # pgvector retrieval & embedding
│       ├── persistence_service.py     # Supabase Postgres persistence
│       ├── session_store.py           # In-memory session fallback
│       ├── storage_service.py         # Supabase Storage / local fallback
│       └── report_generator.py        # Final report assembly & scoring
│
└── supabase/
    └── migrations/
        └── 001_init.sql               # Schema: sessions, transcripts, vectors
```

---

## ⚙️ Environment Variables

### Backend — `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_API_KEY` / `GEMINI_API_KEY` | ✅ Yes | Gemini API access key |
| `ENABLE_GEMINI_LIVE` | Optional | Set `true` to enable live audio sessions |
| `DATABASE_URL` | Optional | Supabase Postgres URL — enables persistence + pgvector |
| `SUPABASE_URL` | Optional | Supabase project URL — enables Storage uploads |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase service role key |
| `SUPABASE_STORAGE_BUCKET` | Optional | Storage bucket name (default: `intervue`) |

### Frontend — `frontend/.env.local`

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend REST API base URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000` | Backend WebSocket base URL |

---

## 🚀 Getting Started

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

> Runs on **http://localhost:8000** by default.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

> Runs on **http://localhost:3000** by default.

---

## 🛡️ Fallback Behavior

The app degrades gracefully — run it without any external services for quick local testing:

| Missing Config | Fallback Behavior |
|---|---|
| `DATABASE_URL` absent | Sessions, transcripts & reports fall back to **in-memory store** |
| Supabase Storage keys absent | Resume/JD persisted **locally**; API response includes a warning |
| Gemini API key missing / `ENABLE_GEMINI_LIVE=false` | Interview WebSocket runs an **echo fallback session** |

---

## 🤖 LangGraph Interview Orchestrator

The interview flow is a **stateful graph** with conditional edges that adapt in real time:

```
   [greet] ──► [tech_q] ──► [followup] ──► [hr_q] ──► [wrap]
                  ▲               │
                  └───────────────┘
               (loops back if answer quality is low)

State tracked per turn:
  • difficulty       — adjusts question complexity
  • topic            — current technical domain
  • answer_quality   — evaluated per response
  • sentiment_tags   — injected into Gemini Live context
```

---

## 📊 Scoring & Reports

At session end, **Gemini Flash Lite** (`thinking_level="high"`) generates a structured JSON report via a Pydantic response schema covering:

| Dimension | Description |
|---|---|
| 🗣️ Communication | Clarity, coherence, articulation |
| 💻 Technical | Correctness and depth of answers |
| 💪 Confidence | Tone, assertiveness, pacing |
| 👁️ Eye Contact | MediaPipe face-mesh tracking score |
| ⏱️ Pace | Words-per-minute, filler word count |

Results are displayed on the **Results Page** with per-question feedback cards and a full transcript.

---

## 🧠 RAG Pipeline

```
PDF Resume
    │
    ▼ PyMuPDF → text chunks
    │
    ▼ Embedding model → dense vectors
    │
    ▼ pgvector (Supabase Postgres)
    │
    ▼ Retrieved at interview time to ground Gemini context
```

Retrieval-augmented context ensures the AI interviewer asks **resume-specific questions** — referencing your actual projects, skills, and experience.

---

## 🗄️ Database Schema

Migrations live in `supabase/migrations/001_init.sql` and define:

- **`sessions`** — interview session metadata (start time, role, JD reference)
- **`transcripts`** — turn-by-turn conversation with sentiment tags
- **`vectors`** — pgvector embeddings for RAG retrieval
- **`reports`** — final structured scoring JSON per session

---

## 🔑 Key Files Quick Reference

| What you want | Where to look |
|---|---|
| Backend entry point | [`backend/main.py`](backend/main.py) |
| Live WebSocket session logic | [`backend/routers/websocket.py`](backend/routers/websocket.py) |
| All backend services | [`backend/services/`](backend/services) |
| LangGraph interview orchestrator | [`backend/services/langgraph_agent.py`](backend/services/langgraph_agent.py) |
| Gemini Live audio streaming | [`backend/services/gemini_live_service.py`](backend/services/gemini_live_service.py) |
| RAG retrieval & embedding | [`backend/services/rag_service.py`](backend/services/rag_service.py) |
| Report generation & scoring | [`backend/services/report_generator.py`](backend/services/report_generator.py) |
| Frontend live interview UI | [`frontend/app/interview/page.tsx`](frontend/app/interview/page.tsx) |
| Database migrations | [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) |

---

## 🚢 Deployment Notes

- **Backend** — FastAPI on port `8000`; set `DATABASE_URL` and Supabase keys for full persistence
- **Frontend** — Next.js dev server on port `3000`; set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to point at your deployed backend
- **`ENABLE_GEMINI_LIVE=true`** must be set to activate real voice sessions; without it the system runs in echo-fallback mode

---

<div align="center">

*Built with Next.js · FastAPI · Supabase · Gemini 2.0 Flash Live · LangGraph · pgvector*

</div>
