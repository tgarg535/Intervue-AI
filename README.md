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
