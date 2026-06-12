import { state } from './state.js';

let context;

export const initAudio = () => {
  if (!context) context = new AudioContext();
};

export const playTone = (
  frequency = 440,
  duration = 0.12,
  gain = 0.06,
  type = 'sine',
) => {
  if (!state.soundOn || !context) return;

  const oscillator = context.createOscillator();
  const volume = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  volume.gain.setValueAtTime(0.0001, context.currentTime);
  volume.gain.exponentialRampToValueAtTime(gain, context.currentTime + 0.01);
  volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(volume);
  volume.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration + 0.02);
};

export const sounds = {
  build: () => playTone(520, 0.08, 0.05, 'triangle'),
  delete: () => playTone(180, 0.09, 0.05, 'sawtooth'),
  harvest: () => {
    playTone(660, 0.08, 0.05, 'triangle');
    setTimeout(() => playTone(880, 0.1, 0.04, 'triangle'), 80);
  },
  warning: () => playTone(240, 0.18, 0.04, 'square'),
  toggle: () => playTone(420, 0.08, 0.035, 'sine'),
};
