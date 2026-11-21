/**
 * Project Templates - Shared project/scene factory functions
 * Clean-room: no external dependencies, pure data factories
 */

import { ensureTiming } from '../tts.js';

// Default empty scene used when creating new scenes
export function blankScene(index = 0) {
  return {
    id: `sc_${Date.now()}_${index}`,
    text: '',
    style: 'kotak',
    camera: 'static',
    transition: 'cut',
    dur: 4,
    bg: 220,
    words: [],
  };
}

// Default demo project used when no project exists yet
export function demoProject() {
  return ensureTiming({
    version: 1,
    title: 'Demo Project',
    scenes: [
      {
        id: 'sc_demo_0',
        text: 'Selamat datang di MauBuatShortVid.',
        style: 'kotak',
        camera: 'static',
        transition: 'fade',
        dur: 4,
        bg: 220,
      },
      {
        id: 'sc_demo_1',
        text: 'Buat video pendek dari naskah dalam hitungan menit.',
        style: 'karaoke',
        camera: 'push',
        transition: 'slide',
        dur: 5,
        bg: 260,
      },
      {
        id: 'sc_demo_2',
        text: 'Naskah → Suara → Subtitle → Animasi → Export.',
        style: 'neon',
        camera: 'pull',
        transition: 'zoom',
        dur: 5,
        bg: 300,
      },
    ],
  });
}