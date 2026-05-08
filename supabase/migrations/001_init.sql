-- Enable the pgvector extension for RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Sessions Table: Tracks metadata for each interview
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID, -- Optional: link to a user profile
    jd_text TEXT,
    resume_url TEXT
);

-- 2. Transcript Chunks: Stores the raw PCM text & sentiment for RAG/Reports
CREATE TABLE transcript_chunks (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    speaker TEXT, -- 'user' or 'interviewer'
    content TEXT,
    sentiment_tag TEXT, -- e.g., 'calm', 'anxious'
    embedding vector(1536), -- Vector size for Gemini embeddings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Reports Table: Stores the final Gemini 3.1 Flash Lite output
CREATE TABLE reports (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    communication_score INT,
    technical_score INT,
    confidence_score INT,
    overall_summary TEXT,
    feedback_json JSONB, -- Stores the "Feedback Cards"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);