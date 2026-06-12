import { state } from './state.js';

let context;
let masterGain;
let musicGain;
let sfxGain;
let delayNode;
let delayFeedback;
let musicTimer;
let musicStep = 0;
let targetMusicLevel = 0.12;

const scale = [0, 3, 5, 7, 10, 12, 15, 17];
const root = 196;

const frequencyForStep = (step, octave = 0) => root * (2 ** ((step + octave * 12) / 12));

const createGain = (gain) => {
  const node = context.createGain();
  node.gain.value = gain;
  return node;
};

const ensureGraph = () => {
  if (context) return;

  context = new AudioContext();
  masterGain = createGain(state.soundOn ? 0.9 : 0);
  musicGain = createGain(0);
  sfxGain = createGain(0.75);
  delayNode = context.createDelay(1.2);
  delayNode.delayTime.value = 0.22;
  delayFeedback = createGain(0.22);

  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayNode.connect(masterGain);
  musicGain.connect(delayNode);
  musicGain.connect(masterGain);
  sfxGain.connect(masterGain);
  masterGain.connect(context.destination);
};

const envelope = (gainNode, peak, duration, attack = 0.02, release = 0.08) => {
  const now = context.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(attack + release, duration));
};

const playVoice = ({
  frequency,
  duration = 0.16,
  gain = 0.05,
  type = 'sine',
  destination = sfxGain,
  attack = 0.01,
  release = 0.1,
  filterFrequency,
}) => {
  if (!state.soundOn || !context) return;

  const oscillator = context.createOscillator();
  const volume = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  envelope(volume, gain, duration, attack, release);

  if (filterFrequency) {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    oscillator.connect(filter);
    filter.connect(volume);
  } else {
    oscillator.connect(volume);
  }

  volume.connect(destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration + release + 0.03);
};

const playMusicPulse = () => {
  if (!context) return;
  const level = state.soundOn && state.running && !state.paused ? targetMusicLevel : 0;
  musicGain.gain.setTargetAtTime(level, context.currentTime, 0.35);
  if (!level) return;

  const degree = scale[musicStep % scale.length];
  const bassDegree = scale[Math.floor(musicStep / 2) % 4] - 12;
  playVoice({
    frequency: frequencyForStep(degree, musicStep % 8 === 7 ? 1 : 0),
    duration: 0.34,
    gain: 0.028,
    type: 'triangle',
    destination: musicGain,
    attack: 0.04,
    release: 0.28,
    filterFrequency: 1800,
  });
  if (musicStep % 2 === 0) {
    playVoice({
      frequency: frequencyForStep(bassDegree),
      duration: 0.48,
      gain: 0.018,
      type: 'sine',
      destination: musicGain,
      attack: 0.05,
      release: 0.35,
      filterFrequency: 700,
    });
  }
  musicStep++;
};

const startMusic = () => {
  if (musicTimer) return;
  musicTimer = setInterval(playMusicPulse, 520);
};

export const initAudio = () => {
  ensureGraph();
  if (context.state === 'suspended') context.resume();
  startMusic();
};

export const updateMusicMood = (waterAverage = 40) => {
  targetMusicLevel = 0.08 + Math.min(0.09, waterAverage / 1000);
  if (masterGain) {
    masterGain.gain.setTargetAtTime(state.soundOn ? 0.9 : 0, context.currentTime, 0.05);
  }
};

export const playTone = (
  frequency = 440,
  duration = 0.12,
  gain = 0.06,
  type = 'sine',
) => {
  playVoice({
    frequency,
    duration,
    gain,
    type,
    destination: sfxGain,
  });
};

export const sounds = {
  build: () => {
    playTone(520, 0.08, 0.045, 'triangle');
    setTimeout(() => playTone(700, 0.06, 0.025, 'sine'), 45);
  },
  delete: () => playTone(180, 0.11, 0.045, 'sawtooth'),
  harvest: () => {
    playTone(660, 0.08, 0.05, 'triangle');
    setTimeout(() => playTone(880, 0.1, 0.04, 'triangle'), 80);
    setTimeout(() => playTone(1180, 0.14, 0.025, 'sine'), 150);
  },
  warning: () => playTone(240, 0.18, 0.035, 'square'),
  toggle: () => playTone(420, 0.08, 0.03, 'sine'),
  invalid: () => playTone(150, 0.09, 0.04, 'square'),
  objective: () => {
    [520, 660, 880, 1040].forEach((note, index) => {
      setTimeout(() => playTone(note, 0.14, 0.045, 'triangle'), index * 75);
    });
  },
  season: () => {
    [330, 440, 550].forEach((note, index) => {
      setTimeout(() => playTone(note, 0.28, 0.035, 'sine'), index * 120);
    });
  },
};
