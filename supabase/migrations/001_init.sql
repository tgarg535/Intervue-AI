-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    jd_text      TEXT,
    resume_url   TEXT,
    jd_url       TEXT,
    resume_text  TEXT,
    metadata     JSONB DEFAULT '{}'::jsonb
);

-- Transcript chunks (RAG source + report input)
CREATE TABLE IF NOT EXISTS transcript_chunks (
    id           BIGSERIAL PRIMARY KEY,
    session_id   UUID REFERENCES sessions(id) ON DELETE CASCADE,
    speaker      TEXT,                  -- 'user' | 'interviewer'
    content      TEXT,
    sentiment_tag TEXT,                 -- 'calm' | 'anxious' | null
    extras       JSONB DEFAULT '{}'::jsonb,
    -- Gemini text-embedding-004 outputs 768-dim vectors
    embedding    vector(768),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Final reports
CREATE TABLE IF NOT EXISTS reports (
    id                   BIGSERIAL PRIMARY KEY,
    session_id           UUID REFERENCES sessions(id) ON DELETE CASCADE,
    communication_score  INT,
    technical_score      INT,
    confidence_score     INT,
    eye_contact_score    INT,
    pace_score           INT,
    overall_summary      TEXT,
    feedback_json        JSONB,
    UNIQUE(session_id),
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast session-scoped similarity search
CREATE INDEX IF NOT EXISTS transcript_embedding_idx
    ON transcript_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);