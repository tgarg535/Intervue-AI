import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables (API keys, DB URLs)
load_dotenv()

# Import the grouped routers from your routers directory
from routers import ingest, websocket, report
from services.persistence_service import persistence_service
from services.storage_service import storage_service

app = FastAPI(
    title="Intervue AI Backend",
    description="Backend orchestrator for real-time AI technical interviews."
)

# 1. Configure CORS
# Allows your Next.js frontend (typically port 3000) to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Register Routers
# This connects the files in your routers/ folder to the main application
app.include_router(ingest.router)    # Handles PDF/JD uploads
app.include_router(websocket.router) # Handles Gemini Live audio stream
app.include_router(report.router)    # Handles final scoring and feedback

@app.get("/")
async def root():
    """Health check endpoint to verify the backend is online."""
    return {
        "status": "Intervue AI Backend is running",
        "version": "1.1.0",
        "capabilities": {
            "persistence": persistence_service.status.enabled,
            "storage": storage_service.enabled,
            "gemini_live": os.getenv("ENABLE_GEMINI_LIVE", "false").lower() == "true",
        },
    }

if __name__ == "__main__":
    import uvicorn
    # Start the server on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)