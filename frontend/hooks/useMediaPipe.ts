import { useEffect, useRef, useState, useCallback } from 'react';
import type { RefObject } from 'react';

export type Posture = 'good' | 'bad';
export type Sentiment = 'calm' | 'anxious';

interface MediaPipeHook {
  posture: Posture;
  sentiment: Sentiment;
  runDetection: () => void;
}

export function useMediaPipe(videoRef: RefObject<HTMLVideoElement>): MediaPipeHook {
  const [posture, setPosture] = useState<Posture>('good');
  const [sentiment, setSentiment] = useState<Sentiment>('calm');

  const poseRef = useRef<unknown>(null);
  const faceRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { PoseLandmarker, FaceLandmarker, FilesetResolver } =
          await import('@mediapipe/tasks-vision');

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
        );

        if (cancelled) return;

        poseRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
        });

        faceRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          outputFaceBlendshapes: true,
        });
      } catch (err) {
        console.warn('[MediaPipe] failed to load models:', err);
      }
    };

    void load();

    return () => {
      cancelled = true;
      (poseRef.current as { close?: () => void } | null)?.close?.();
      (faceRef.current as { close?: () => void } | null)?.close?.();
    };
  }, []);

  const runDetection = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const ts = performance.now();

    // Posture
    const pose = poseRef.current as {
      detectForVideo: (v: HTMLVideoElement, t: number) => {
        landmarks?: { x: number; y: number; z: number }[][];
      };
    } | null;

    if (pose) {
      const { landmarks } = pose.detectForVideo(video, ts);
      if (landmarks && landmarks.length > 0) {
        const lm = landmarks[0]!;
        const nose = lm[0];
        const lShoulder = lm[11];
        const rShoulder = lm[12];
        if (nose && lShoulder && rShoulder) {
          const avgSY = (lShoulder.y + rShoulder.y) / 2;
          setPosture(nose.y > avgSY - 0.05 ? 'bad' : 'good');
        }
      }
    }

    // Sentiment
    const face = faceRef.current as {
      detectForVideo: (v: HTMLVideoElement, t: number) => {
        faceBlendshapes?: { categories: { categoryName: string; score: number }[] }[];
      };
    } | null;

    if (face) {
      const { faceBlendshapes } = face.detectForVideo(video, ts);
      if (faceBlendshapes && faceBlendshapes.length > 0) {
        const cats = faceBlendshapes[0]!.categories;
        const browDown = cats.find(c => c.categoryName === 'browDownLeft')?.score ?? 0;
        const jawFwd = cats.find(c => c.categoryName === 'jawForward')?.score ?? 0;
        setSentiment(browDown > 0.4 || jawFwd > 0.4 ? 'anxious' : 'calm');
      }
    }
  }, [videoRef]);

  return { posture, sentiment, runDetection };
}