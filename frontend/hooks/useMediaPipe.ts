import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { 
  PoseLandmarker, 
  FaceLandmarker, 
  FilesetResolver 
} from '@mediapipe/tasks-vision';

/**
 * Custom hook to handle MediaPipe CPU-based vision tasks.
 * Tracks posture (Pose) and sentiment (Face Blendshapes).
 */
export const useMediaPipe = (videoRef: RefObject<HTMLVideoElement>) => {
  const [posture, setPosture] = useState<'good' | 'bad'>('good');
  const [sentiment, setSentiment] = useState<'calm' | 'anxious'>('calm');
  
  // Refs to hold the AI model instances
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);

  useEffect(() => {
    const setupAI = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        // 1. Initialize Pose Landmarker (for the Posture Bar)
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "CPU" // Running on CPU as per architecture flowchart
          },
          runningMode: "VIDEO"
        });

        // 2. Initialize Face Landmarker (for Sentiment/Anxiety detection)
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          outputFaceBlendshapes: true
        });

        console.log("MediaPipe AI Models Loaded Successfully");
      } catch (error) {
        console.error("Failed to initialize MediaPipe:", error);
      }
    };

    setupAI();

    // Cleanup models on unmount
    return () => {
      poseLandmarkerRef.current?.close();
      faceLandmarkerRef.current?.close();
    };
  }, []);

  /**
   * Main detection function called by the component's render loop.
   */
  const runDetection = () => {
    const video = videoRef.current;
    const poseModel = poseLandmarkerRef.current;
    const faceModel = faceLandmarkerRef.current;

    // Only run if video and models are ready
    if (video && video.readyState >= 2 && poseModel && faceModel) {
      const timestamp = performance.now();

      // --- Posture Analysis ---
      const poseResults = poseModel.detectForVideo(video, timestamp);
      if (poseResults.landmarks?.length > 0) {
        const nose = poseResults.landmarks[0]?.[0];
        const leftShoulder = poseResults.landmarks[0]?.[11];
        const rightShoulder = poseResults.landmarks[0]?.[12];
        
        if (nose && leftShoulder && rightShoulder) {
          const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

          // Logic: if nose drops below a certain threshold relative to shoulders
          setPosture(nose.y > avgShoulderY - 0.05 ? 'bad' : 'good');
        }
      }

      // --- Sentiment Analysis ---
      const faceResults = faceModel.detectForVideo(video, timestamp);
      if (faceResults.faceBlendshapes?.length > 0) {
        const blendshapes = faceResults.faceBlendshapes[0]?.categories;
        
        if (blendshapes) {
          // Find specific markers for anxiety (e.g., brow lowering or lip biting)
          const browDown = blendshapes.find(s => s.categoryName === 'browDownLeft')?.score || 0;
          const jawClench = blendshapes.find(s => s.categoryName === 'jawForward')?.score || 0;

          setSentiment((browDown > 0.4 || jawClench > 0.4) ? 'anxious' : 'calm');
        }
      }
    }
  };

  return { posture, sentiment, runDetection };
};