import { useState, useEffect, useCallback, useRef } from 'react';

export const useWebsocket = (sessionId: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState("");
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to the Python FastAPI WebSocket endpoint
    const socket = new WebSocket(`ws://localhost:8000/ws/interview/${sessionId}`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("Connected to Intervue AI Backend");
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // 1. Handle incoming audio from Gemini
      if (data.audio) {
        playOutputAudio(data.audio);
      }
      
      // 2. Handle live transcripts for the UI
      if (data.transcript) {
        setTranscript(data.transcript);
      }
    };

    socket.onclose = () => setIsConnected(false);

    return () => socket.close();
  }, [sessionId]);

  // Helper to play base64 audio chunks from the server
  const playOutputAudio = (base64Audio: string) => {
    const audioData = atob(base64Audio);
    const arrayBuffer = new Uint8Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      arrayBuffer[i] = audioData.charCodeAt(i);
    }
    // Logic to play PCM data would go here (using Web Audio API) 
  };

  // Function to send audio or sentiment tags to Python
  const sendMessage = useCallback((message: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { isConnected, transcript, sendMessage };
};