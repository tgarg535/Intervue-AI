# Intervue AI

Architecture-aligned implementation for AI interview simulation with:
- Next.js frontend (`frontend`)
- FastAPI backend (`backend`)
- Supabase Postgres + Storage (`supabase`)

## Environment Variables

### Backend (`backend/.env`)
- `GOOGLE_API_KEY` (or `GEMINI_API_KEY`)
- `ENABLE_GEMINI_LIVE=true` to enable Gemini Live audio sessions
- `DATABASE_URL` for Supabase Postgres (enables persistence + pgvector)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (enables Storage uploads)
- `SUPABASE_STORAGE_BUCKET` (default: `intervue`)

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`)
- `NEXT_PUBLIC_WS_URL` (default: `ws://localhost:8000`)

## Run

Backend:
```bash
cd backend
pip install -r requirements.txt
python main.py
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Fallback Behavior

- Missing `DATABASE_URL`: session/transcript/report fall back to in-memory service.
- Missing Supabase storage keys: resume/JD upload persists locally for ingest, response includes warnings.
- Missing Gemini API key or disabled live mode: interview websocket runs an echo fallback session.

## Architecture

Overview: The project is split into three primary layers — Frontend, Backend, and Infrastructure — designed to support interactive AI-led interviews with optional live audio, RAG-enabled context, and persistent session/report storage.

- Frontend (Next.js) - [frontend]:
	- Pages: `app/page.tsx`, `app/interview/page.tsx`, `app/results/[id]/page.tsx` provide the main UI flows (landing, live interview, results).
	- Components: `components/WebcamFeed.tsx`, `components/LiveAudioVisualizer.tsx` handle media capture and visualization.
	- Hooks: `hooks/useWebsocket.ts`, `hooks/useMediaPipe.ts` manage real-time connections and pose/media utilities.
	- Public: `public/audio-capture-worklet.js` contains the Worklet for audio capture used in live sessions.
	- Behavior: connects to the backend REST API and WebSocket endpoints (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`) for ingesting media, receiving live question prompts, and streaming partial transcripts.

- Backend (FastAPI) - [backend]:
	- Entry: `main.py` configures FastAPI, mounts routers, and starts HTTP + WebSocket endpoints.
	- Routers: `backend/routers/ingest.py` (file/JD ingest), `report.py` (reporting), `websocket.py` (live interview sessions).
	- Services (in `backend/services`):
		- `gemini_live_service.py`: handles streaming to/from Gemini/voice models for live audio sessions.
		- `langgraph_agent.py`: orchestrates LLM-driven dialog flows and agent logic.
		- `rag_service.py`: performs retrieval-augmented generation using stored embeddings (pgvector or other vector DB).
		- `persistence_service.py` + `session_store.py`: manage session state and persist transcripts/reports to Supabase Postgres (or in-memory fallback).
		- `storage_service.py`: uploads/resolves files to Supabase Storage (or local fallback).
		- `report_generator.py`: assembles final interview reports from transcripts, evaluations, and metadata.

- Data flow (high-level):
	1. User starts interview in frontend → frontend opens WebSocket to backend (`/ws/interview`).
	2. Media (audio/video frames) and events stream to backend; partial transcripts and events stream back in real-time.
	3. Backend may call `gemini_live_service` for real-time speech/response generation and `rag_service` for context-enhanced answers.
	4. At session end, `persistence_service` stores transcripts, embeddings, and generated reports in Supabase Postgres and Storage.

- Storage & DB - [supabase]:
	- `supabase/migrations/001_init.sql` contains initial schema including tables for sessions, transcripts, and vectors (pgvector).
	- Supabase Storage is used for uploaded resumes/JDs and any media artifacts.

## Deployment notes

- Local development defaults: backend runs on port `8000` (FastAPI), frontend uses Next.js dev server (usually port `3000`).
- Environment variables listed above control external services (Gemini/LLM keys, Supabase connection, feature toggles like `ENABLE_GEMINI_LIVE`).
- If `DATABASE_URL` is absent the app uses in-memory stores and disables long-term persistence; this is intended for quick local testing.

## Where to look

- Backend entry: [backend/main.py](backend/main.py)
- Live session logic: [backend/routers/websocket.py](backend/routers/websocket.py)
- Core services: [backend/services](backend/services)
- Frontend main UI: [frontend/app/interview/page.tsx](frontend/app/interview/page.tsx)

If you want, I can also add a simple ASCII sequence diagram or a contribution section outlining how to add new services.
