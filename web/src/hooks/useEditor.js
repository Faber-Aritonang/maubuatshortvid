/**
 * Editor Hooks - Canvas rendering, playback, export
 */

import { useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '../store/index.js';
import { drawProject, projectDuration, sceneAt, CANVAS_W, CANVAS_H } from '../renderer.js';
import { speakAll, stopSpeak, ensureTiming } from '../tts.js';
import { exportVideo, downloadBlob } from '../exporter.js';

/**
 * Hook for canvas rendering
 */
export function useCanvas() {
  const canvasRef = useRef(null);
  const { currentTime, playing } = useEditorStore();
  const { currentProject } = useProjectStore();

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const project = currentProject;
    if (!canvas || !project) return;
    const ctx = canvas.getContext('2d');
    drawProject(ctx, project, currentTime);
  }, [canvasRef, currentProject, currentTime]);

  // Render on time/project change
  useEffect(() => {
    render();
  }, [render]);

  return { canvasRef, render };
}


/**
 * Hook for playback control
 */
export function usePlayback() {
  const {
    playing,
    currentTime,
    setPlaying,
    setTime,
    playbackRate,
    setRate,
    ttsRate,
    setTTSPlaying,
  } = useEditorStore();
  const { currentProject, duration } = useCurrentProject();

  const totalDuration = duration;
  const rafRef = useRef(0);
  const t0Ref = useRef(0);

  // Animation frame loop
  useEffect(() => {
    if (!playing) return;
    t0Ref.current = performance.now() - currentTime * 1000;

    function frame(now) {
      const t = (now - t0Ref.current) / 1000;
      if (t >= totalDuration) {
        setTime(0);
        t0Ref.current = now;
      } else {
        setTime(t);
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, totalDuration, currentTime, setTime]);

  const toggle = useCallback(() => {
    setPlaying(!playing);
  }, [playing, setPlaying]);

  const restart = useCallback(() => {
    setTime(0);
    setPlaying(true);
  }, [setTime, setPlaying]);

  const seek = useCallback((time) => {
    setPlaying(false);
    setTime(time);
  }, [setPlaying, setTime]);

  const changeRate = useCallback((rate) => {
    setRate(rate);
  }, [setRate]);

  return {
    playing,
    currentTime,
    totalDuration,
    playbackRate,
    ttsRate,
    toggle,
    restart,
    seek,
    changeRate,
    progress: totalDuration > 0 ? currentTime / totalDuration : 0,
  };
}


/**
 * Hook for TTS (Text-to-Speech)
 */
export function useTTS() {
  const { ttsRate, setTTSPlaying } = useEditorStore();
  const { currentProject } = useCurrentProject();
  const controllerRef = useRef(null);

  const speak = useCallback(() => {
    if (!currentProject) return;
    setTTSPlaying(true);
    stopSpeak();
    controllerRef.current = speakAll(currentProject.scenes, {
      rate: ttsRate,
      onEnd: () => setTTSPlaying(false),
    });
  }, [currentProject, ttsRate, setTTSPlaying]);

  const stop = useCallback(() => {
    stopSpeak();
    setTTSPlaying(false);
  }, [setTTSPlaying]);

  return {
    speaking: useEditorStore.getState().ttsPlaying,
    speak,
    stop,
    rate: ttsRate,
  };
}

/**
 * Hook for video export
 */
export function useExport() {
  const { exporting, exportProgress, setExporting } = useEditorStore();
  const { currentProject, duration } = useCurrentProject();
  const canvasRef = useRef(null);

  const exportVideoFile = useCallback(async () => {
    const canvas = canvasRef.current;
    const project = currentProject;
    if (!canvas || !project) return;

    setExporting(true, 0);
    stopSpeak();

    try {
      const timed = ensureTiming(project);
      const ctx = canvas.getContext('2d');
      const blob = await exportVideo({
        canvas,
        audioEl: null, // v0.1: video only, TTS played separately
        totalDur: duration,
        draw: (t) => drawProject(ctx, timed, t),
        onProgress: (p) => setExporting(true, p),
      });

      downloadBlob(blob, 'shortvid.webm');
      setExporting(false, 0);

      return blob;
    } catch (e) {
      setExporting(false, 0);
      throw e;
    }
  }, [currentProject, duration, setExporting]);

  const exportJSON = useCallback(() => {
    const project = currentProject;
    if (!project) return;
    downloadBlob(
      new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }),
      'project.json'
    );
  }, [currentProject]);

  const importJSON = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const p = JSON.parse(e.target.result);
          if (!Array.isArray(p.scenes) || !p.scenes.length) {
            throw new Error('Invalid project format');
          }
          resolve(ensureTiming({ version: 1, scenes: p.scenes.slice(0, 6) }));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }, []);

  return {
    exporting,
    exportProgress,
    canvasRef,
    exportVideo: exportVideoFile,
    exportJSON,
    importJSON,
  };
}