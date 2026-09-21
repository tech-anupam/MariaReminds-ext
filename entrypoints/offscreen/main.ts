import { browser } from 'wxt/browser';

let activeAudio: HTMLAudioElement | null = null;

browser.runtime.onMessage.addListener((msg: any) => {
  if (msg?.type === 'PLAY_AUDIO') {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }
    const audioUrl = (browser.runtime as any).getURL(msg.src || 'videos/maria-drink-water.mp3');
    const audio = new Audio(audioUrl);
    audio.volume = 1;
    audio.play().catch((err) => {
      console.warn('Offscreen audio playback notice:', err);
    });
    activeAudio = audio;
    audio.onended = () => {
      activeAudio = null;
    };
  } else if (msg?.type === 'STOP_AUDIO') {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }
  }
});
