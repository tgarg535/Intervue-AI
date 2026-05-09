from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.gemini_live_service import handle_live_session
from services.session_store import session_store

router = APIRouter(tags=["WebSocket"])

@router.websocket("/ws/interview/{session_id}")
async def interview_stream(websocket: WebSocket, session_id: str):
    """
    Handles the real-time audio/sentiment stream between the browser and Gemini Live.
    """
    await websocket.accept()
    print(f"WebSocket session started: {session_id}")
    if not session_store.get(session_id):
        # Graceful fallback: allow interview to continue even if the process
        # restarted and in-memory session data is unavailable.
        session_store.create(session_id=session_id, jd_text="", resume_text="")
        await websocket.send_json(
            {
                "type": "warning",
                "message": "Session context was unavailable. Running interview in fallback mode.",
            }
        )
    
    try:
        # Bridges frontend websocket to Gemini Multimodal Live API
        await handle_live_session(websocket, session_id)
    except WebSocketDisconnect:
        print(f"Client disconnected from session: {session_id}")
    except Exception as e:
        print(f"WebSocket error in {session_id}: {str(e)}")
    finally:
        # Ensure the socket is closed correctly
        try:
            await websocket.close()
        except:
            pass