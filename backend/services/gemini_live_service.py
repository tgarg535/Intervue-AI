"""
Gemini Live audio bridge.
Connects the browser WebSocket to the Gemini Multimodal Live API,
persists transcripts to the session store, and falls back gracefully.
"""
from __future__ import annotations

import asyncio
import base64
import os

from fastapi import WebSocket
from google import genai
from google.genai import types

from services.session_store import session_store

# ------------------------------------------------------------------ #
#  Client                                                               #
# ------------------------------------------------------------------ #

client = genai.Client(
    api_key=os.environ.get("GOOGLE_API_KEY", ""),
    http_options={"api_version": "v1alpha"},
)

# Correct Gemini Live model ID
LIVE_MODEL_ID = "gemini-3.1-flash-live-preview"
ENABLE_GEMINI_LIVE = os.environ.get("ENABLE_GEMINI_LIVE", "false").lower() == "true"


# ------------------------------------------------------------------ #
#  Fallback (no Live API available)                                     #
# ------------------------------------------------------------------ #

async def _echo_fallback_session(websocket: WebSocket, session_id: str) -> None:
    """Keep the browser socket alive when the Gemini Live session cannot start."""
    await websocket.send_json({
        "type": "transcript",
        "speaker": "interviewer",
        "text": (
            "Welcome! The live AI audio stream is temporarily unavailable. "
            "Please ensure your GOOGLE_API_KEY is set and try again."
        ),
    })
    while True:
        try:
            message = await websocket.receive_json()
            if "text" in message:
                session_store.add_transcript(session_id, "user", message["text"])
                await websocket.send_json({
                    "type": "transcript",
                    "speaker": "interviewer",
                    "text": f"(Echo) You said: {message['text']}",
                })
        except Exception:
            break


# ------------------------------------------------------------------ #
#  Main handler                                                         #
# ------------------------------------------------------------------ #

async def handle_live_session(websocket: WebSocket, session_id: str) -> None:
    if not ENABLE_GEMINI_LIVE or not os.environ.get("GOOGLE_API_KEY"):
        await _echo_fallback_session(websocket, session_id)
        return

    # Build a rich system prompt using the session's resume + JD
    context_block = session_store.get_context_block(session_id)
    base_instruction = (
        "You are Intervue, a senior AI technical interviewer. "
        "Conduct a focused interview following this flow:\n"
        "1. GREET: Welcome the candidate warmly (30 s)\n"
        "2. TECH: Ask 3 technical questions. Adapt difficulty based on their answers. "
        "Start moderate, go harder if correct, easier if struggling.\n"
        "3. HR: Ask 2 behavioural questions (STAR format expected).\n"
        "4. WRAP: Summarise, thank the candidate, and close.\n\n"
        "Be professional, encouraging, and concise. Do NOT reveal scores or feedback during the interview.\n"
    )
    system_instruction = (
        f"{base_instruction}\n\n{context_block}"
        if context_block
        else base_instruction
    )

    config = types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        system_instruction=system_instruction,
        # Request output transcription so we can surface captions in the UI
        output_audio_transcription=types.AudioTranscriptionConfig(),
        input_audio_transcription=types.AudioTranscriptionConfig(),
    )

    try:
        live_connect = client.aio.live.connect(model=LIVE_MODEL_ID, config=config)
    except Exception as exc:
        print(f"[Live] connect setup failed for {session_id}: {exc}")
        await _echo_fallback_session(websocket, session_id)
        return

    try:
        async with live_connect as session:

            # -------------------------------------------------------- #
            #  Browser → Gemini                                          #
            # -------------------------------------------------------- #
            async def receive_from_browser() -> None:
                try:
                    while True:
                        message = await websocket.receive_json()
                        msg_type = message.get("type", "")

                        if msg_type == "audio" or "audio" in message:
                            # Raw PCM audio from the browser (base64)
                            raw = base64.b64decode(message.get("audio", message.get("data", "")))
                            await session.send(
                                input=types.Blob(data=raw, mime_type="audio/pcm;rate=16000")
                            )

                        elif msg_type == "text" or "text" in message:
                            text = message.get("text", "")
                            session_store.add_transcript(session_id, "user", text)
                            await session.send(input=text, end_of_turn=True)

                        elif msg_type == "end_of_turn":
                            await session.send(input="", end_of_turn=True)

                except Exception as exc:
                    print(f"[Live] browser→gemini error ({session_id}): {exc}")

            # -------------------------------------------------------- #
            #  Gemini → Browser                                          #
            # -------------------------------------------------------- #
            async def send_to_browser() -> None:
                try:
                    async for response in session.receive():
                        sc = response.server_content

                        # 1. Audio response parts
                        if sc and sc.model_turn and sc.model_turn.parts:
                            for part in sc.model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    audio_b64 = base64.b64encode(part.inline_data.data).decode()
                                    await websocket.send_json({
                                        "type": "audio",
                                        "data": audio_b64,
                                    })

                        # 2. Output transcription (AI speech → text)
                        if sc and sc.output_transcription and sc.output_transcription.text:
                            text = sc.output_transcription.text
                            session_store.add_transcript(session_id, "interviewer", text)
                            await websocket.send_json({
                                "type": "transcript",
                                "speaker": "interviewer",
                                "text": text,
                            })

                        # 3. Input transcription (user speech → text)
                        if sc and sc.input_transcription and sc.input_transcription.text:
                            text = sc.input_transcription.text
                            session_store.add_transcript(session_id, "user", text)
                            await websocket.send_json({
                                "type": "transcript",
                                "speaker": "user",
                                "text": text,
                            })

                        # 4. Turn complete signal
                        if sc and sc.turn_complete:
                            await websocket.send_json({"type": "turn_complete"})

                except Exception as exc:
                    print(f"[Live] gemini→browser error ({session_id}): {exc}")

            await asyncio.gather(receive_from_browser(), send_to_browser())

    except Exception as exc:
        print(f"[Live] session failed for {session_id}: {exc}")
        await _echo_fallback_session(websocket, session_id)