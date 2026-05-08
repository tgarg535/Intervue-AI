import os
import asyncio
import base64
from google import genai
from google.genai import types
from fastapi import WebSocket

# Initialize the GenAI Client
client = genai.Client(
    api_key=os.environ.get("GOOGLE_API_KEY"),
    http_options={'api_version': 'v1alpha'}
)

LIVE_MODEL_ID = "gemini-3.1-flash-live-preview"


async def _echo_fallback_session(websocket: WebSocket, session_id: str):
    """Keep the browser socket alive when the Gemini Live session cannot start."""
    await websocket.send_json({
        "transcript": f"Live AI is temporarily unavailable for session {session_id}."
    })

    while True:
        message = await websocket.receive_json()

        if "text" in message:
            await websocket.send_json({"transcript": message["text"]})
        elif "audio" in message:
            await websocket.send_json({
                "transcript": "Audio received, but live model streaming is not available right now."
            })

async def handle_live_session(websocket: WebSocket, session_id: str):
    config = types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        system_instruction=(
            "You are the Intervue AI Orchestrator. Use the uploaded Resume and JD context. "
            "Follow the flow: Greet -> Tech Q -> HR Q -> Wrap. "
            "Listen to the user's audio and respond naturally."
        )
    )

    # Start the session
    try:
        live_connect = client.aio.live.connect(model=LIVE_MODEL_ID, config=config)
    except Exception as exc:
        print(f"Gemini Live connect setup failed for {session_id}: {exc}")
        await _echo_fallback_session(websocket, session_id)
        return

    try:
        async with live_connect as session:
        
            async def receive_from_browser():
                """Receives audio chunks and sentiment tags from the frontend."""
                try:
                    while True:
                        message = await websocket.receive_json()
                        
                        # 1. Handle Audio Stream (Base64 encoded from browser)
                        if "audio" in message:
                            audio_data = base64.b64decode(message["audio"])
                            await session.send(
                                input=types.Blob(
                                    data=audio_data,
                                    mime_type="audio/pcm;rate=16000"
                                )
                            )
                        
                        # 2. Handle Sentiment Tags / Text Updates
                        elif "text" in message:
                            await session.send(input=message["text"], end_of_turn=True)
                            
                except Exception as e:
                    print(f"Browser receive error: {e}")

            async def send_to_browser():
                """Receives audio and transcripts from Gemini and sends to frontend."""
                try:
                    async for response in session.receive():
                        # 1. Handle Audio Response Parts
                        if response.server_content and response.server_content.model_turn:
                            if response.server_content.model_turn.parts:
                                for part in response.server_content.model_turn.parts:
                                    if part.inline_data and part.inline_data.data:
                                        # Encode to base64 so it can be sent over JSON websocket
                                        audio_b64 = base64.b64encode(part.inline_data.data).decode('utf-8')
                                        await websocket.send_json({"audio": audio_b64})
                        
                        # 2. Handle Transcripts (for the live captions/UI)
                        content = response.server_content
                        if content and content.model_turn:
                             if content.output_transcription:
                                await websocket.send_json({"transcript": content.output_transcription})

                except Exception as e:
                    print(f"Gemini receive error: {e}")

            # Run both loops concurrently
            await asyncio.gather(receive_from_browser(), send_to_browser())
    except Exception as exc:
        print(f"Gemini Live session failed for {session_id}: {exc}")
        await _echo_fallback_session(websocket, session_id)