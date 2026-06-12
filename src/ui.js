import { colors } from './colors.js';
import { createElement, createSvgElement } from './dom.js';
import { setGridVisible } from './board.js';
import { initAudio, sounds } from './audio.js';
import { fields, state } from './state.js';

const shell = createElement();
const menu = createElement();
const stats = createElement();
const scoreValue = createElement();
const canalValue = createElement();
const seasonValue = createElement();
const waterValue = createElement();
const waterFill = createElement();
const warning = createElement();

let pauseButton;
let gridButton;
let deleteButton;
let soundButton;
let lastToastTimeout;

const seasonNames = ['Mist', 'Drift', 'Bloom', 'Sun'];

const iconPaths = {
  pause: ['M7 5v10M13 5v10'],
  play: ['M7 5l8 5-8 5z'],
  grid: ['M5 4v12M11 4v12M4 7h12M4 13h12'],
  delete: ['M6 6l8 8M14 6l-8 8', 'M5 4h10M8 4l1-2h2l1 2M6 7v9h8V7'],
  sound: ['M4 10h3l4-4v12l-4-4H4z', 'M14 8q2 2 0 4'],
  mute: ['M4 10h3l4-4v12l-4-4H4z', 'M15 8l4 4M19 8l-4 4'],
};

const makeIcon = (name) => {
  const svg = createSvgElement('svg');
  svg.setAttribute('viewBox', '0 0 22 22');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.width = '22px';
  svg.style.height = '22px';
  iconPaths[name].forEach((d) => {
    const path = createSvgElement('path');
    path.setAttribute('d', d);
    path.setAttribute('fill', name === 'play' ? 'currentColor' : 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', 2);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
  });
  return svg;
};

const setButtonIcon = (button, iconName, label) => {
  const tooltip = button.querySelector('[data-tooltip]');
  button.innerHTML = '';
  button.append(makeIcon(iconName));
  if (tooltip) button.append(tooltip);
  button.setAttribute('aria-label', label);
  button.title = label;
};

const makeToolButton = (label, iconName, onClick) => {
  const button = createElement('button');
  button.style.cssText = `
    position:relative;
    width:48px;
    height:48px;
    min-height:48px;
    display:grid;
    place-items:center;
    padding:0;
    pointer-events:auto;
  `;
  const tooltip = createElement();
  tooltip.dataset.tooltip = 'true';
  tooltip.textContent = label;
  tooltip.style.cssText = `
    position:absolute;
    left:50%;
    bottom:calc(100% + 10px);
    translate:-50% 4px;
    white-space:nowrap;
    padding:7px 10px;
    border-radius:999px;
    background:${colors.text};
    color:${colors.panel};
    font-size:12px;
    font-weight:850;
    opacity:0;
    pointer-events:none;
    transition:opacity .15s, translate .15s;
  `;
  button.addEventListener('mouseenter', () => {
    tooltip.style.opacity = 1;
    tooltip.style.translate = '-50% 0';
  });
  button.addEventListener('mouseleave', () => {
    tooltip.style.opacity = 0;
    tooltip.style.translate = '-50% 4px';
  });
  button.addEventListener('focus', () => {
    tooltip.style.opacity = 1;
    tooltip.style.translate = '-50% 0';
  });
  button.addEventListener('blur', () => {
    tooltip.style.opacity = 0;
    tooltip.style.translate = '-50% 4px';
  });
  button.addEventListener('click', onClick);
  button.append(makeIcon(iconName), tooltip);
  button.setAttribute('aria-label', label);
  button.title = label;
  return button;
};

const makeMetric = (label, value, accent) => {
  const metric = createElement();
  metric.style.cssText = `
    min-width:92px;
    display:grid;
    gap:3px;
    padding:10px 12px;
    border-left:3px solid ${accent};
  `;
  const caption = createElement();
  caption.textContent = label;
  caption.style.cssText = `
    color:#52656a;
    font-size:11px;
    font-weight:900;
    letter-spacing:0;
  `;
  value.style.cssText = `
    font-size:22px;
    font-weight:950;
    line-height:1;
  `;
  metric.append(caption, value);
  return metric;
};

const makePrimaryButton = (text, onClick) => {
  const button = createElement('button');
  button.textContent = text;
  button.style.cssText = `
    min-width:120px;
    height:48px;
    background:${colors.text};
    color:${colors.panel};
    box-shadow:0 14px 30px #24333a30;
  `;
  button.addEventListener('click', onClick);
  return button;
};

export const showToast = (message, urgent = false) => {
  warning.textContent = message;
  warning.style.color = urgent ? colors.warning : colors.text;
  warning.style.opacity = 1;
  warning.style.transform = 'translateY(-4px) scale(1.02)';
  clearTimeout(lastToastTimeout);
  lastToastTimeout = setTimeout(() => {
    warning.style.opacity = 0;
    warning.style.transform = 'translateY(0) scale(1)';
  }, urgent ? 1200 : 1700);
};

export const initUi = ({ startGame, restartGame, togglePause }) => {
  shell.style.cssText = `
    position:absolute;
    inset:0;
    pointer-events:none;
    overflow:hidden;
  `;
  document.body.append(shell);

  stats.style.cssText = `
    position:absolute;
    top:16px;
    left:16px;
    display:flex;
    align-items:stretch;
    overflow:hidden;
    border-radius:24px;
    background:#fffdf0d9;
    backdrop-filter:var(--ui-blur);
    box-shadow:0 20px 46px #24444b22, 0 0 0 1px #24444b18;
    pointer-events:none;
    opacity:0;
    transition:opacity .5s, translate .5s;
  `;

  const waterMetric = createElement();
  waterMetric.style.cssText = `
    min-width:138px;
    display:grid;
    gap:8px;
    padding:10px 12px;
    border-left:3px solid ${colors.canal};
  `;
  const waterHeader = createElement();
  waterHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;';
  const waterLabel = createElement();
  waterLabel.textContent = 'Water';
  waterLabel.style.cssText = 'color:#52656a;font-size:11px;font-weight:900;';
  waterValue.style.cssText = 'font-size:14px;font-weight:950;';
  const waterTrack = createElement();
  waterTrack.style.cssText = `
    height:7px;
    overflow:hidden;
    border-radius:999px;
    background:#24444b16;
  `;
  waterFill.style.cssText = `
    width:0;
    height:100%;
    border-radius:999px;
    background:${colors.canal};
    transition:width .25s, background .25s;
  `;
  waterTrack.append(waterFill);
  waterHeader.append(waterLabel, waterValue);
  waterMetric.append(waterHeader, waterTrack);

  stats.append(
    makeMetric('Harvest', scoreValue, colors.crop),
    makeMetric('Canals', canalValue, colors.canal),
    makeMetric('Season', seasonValue, colors.field),
    waterMetric,
  );

  const toolbar = createElement();
  toolbar.style.cssText = `
    position:absolute;
    left:50%;
    bottom:18px;
    translate:-50% 0;
    display:flex;
    align-items:center;
    gap:8px;
    padding:8px;
    border-radius:999px;
    background:#fffdf0d9;
    backdrop-filter:var(--ui-blur);
    box-shadow:0 20px 46px #24444b26, 0 0 0 1px #24444b18;
    pointer-events:auto;
  `;

  pauseButton = makeToolButton('Pause', 'pause', () => {
    initAudio();
    togglePause();
    sounds.toggle();
    showToast(state.paused ? 'Paused' : 'Water is flowing');
  });

  gridButton = makeToolButton('Grid', 'grid', () => {
    initAudio();
    state.gridLocked = !state.gridLocked;
    localStorage.setItem('CloudCanalsGrid', state.gridLocked);
    setGridVisible(state.gridLocked);
    sounds.toggle();
    updateUi();
  });

  deleteButton = makeToolButton('Remove canals', 'delete', () => {
    initAudio();
    state.deleteMode = !state.deleteMode;
    sounds.toggle();
    updateUi();
  });

  soundButton = makeToolButton('Sound', 'sound', () => {
    initAudio();
    state.soundOn = !state.soundOn;
    localStorage.setItem('CloudCanalsSound', state.soundOn);
    sounds.toggle();
    updateUi();
  });

  toolbar.append(pauseButton, gridButton, deleteButton, soundButton);

  warning.style.cssText = `
    position:absolute;
    left:50%;
    bottom:86px;
    translate:-50% 0;
    max-width:min(520px, calc(100vw - 32px));
    padding:11px 15px;
    border-radius:999px;
    background:#fffdf0ed;
    backdrop-filter:var(--ui-blur);
    color:${colors.text};
    font-weight:900;
    box-shadow:0 16px 34px #24444b22, 0 0 0 1px #24444b18;
    opacity:0;
    transition:opacity .2s, transform .2s;
  `;

  menu.style.cssText = `
    position:absolute;
    inset:0;
    display:flex;
    align-items:center;
    padding:clamp(28px, 9vmin, 96px);
    background:linear-gradient(90deg, #fffdf0f5 0 38%, #fffdf0a8 52%, #fffdf000 78%);
    pointer-events:auto;
    transition:opacity .5s;
  `;

  const menuContent = createElement();
  menuContent.style.cssText = `
    display:grid;
    gap:20px;
    max-width:520px;
  `;

  const eyebrow = createElement();
  eyebrow.textContent = 'Cloud Canals';
  eyebrow.style.cssText = `
    color:${colors.spring};
    font-size:13px;
    font-weight:950;
    letter-spacing:0;
    text-transform:uppercase;
  `;

  const title = createElement();
  title.textContent = 'Cloud Canals';
  title.style.cssText = `
    font-size:clamp(52px, 10vh, 96px);
    font-weight:950;
    line-height:.92;
  `;

  const blurb = createElement();
  blurb.textContent = 'Guide cloud springs into thirsty fields and keep every season growing.';
  blurb.style.cssText = `
    max-width:440px;
    font-size:clamp(18px, 2.5vh, 23px);
    line-height:1.42;
    font-weight:820;
    color:#43545a;
  `;

  const menuButtons = createElement();
  menuButtons.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;';

  const startButton = makePrimaryButton('Start', () => {
    initAudio();
    startGame();
  });

  const restartButton = createElement('button');
  restartButton.textContent = 'Restart';
  restartButton.style.height = '48px';
  restartButton.addEventListener('click', () => {
    initAudio();
    restartGame();
  });

  const fullscreenButton = createElement('button');
  fullscreenButton.textContent = 'Fullscreen';
  fullscreenButton.style.height = '48px';
  fullscreenButton.addEventListener('click', () => {
    initAudio();
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  });

  menuButtons.append(startButton, restartButton, fullscreenButton);
  menuContent.append(eyebrow, title, blurb, menuButtons);
  menu.append(menuContent);

  const responsiveStyle = createElement('style');
  responsiveStyle.textContent = `
    @media (max-width: 760px) {
      [data-ui-stats] {
        left: 10px !important;
        right: 10px !important;
        top: 10px !important;
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        border-radius: 18px !important;
      }
      [data-ui-toolbar] {
        bottom: 12px !important;
      }
      [data-ui-menu] {
        align-items: flex-start !important;
        padding-top: 12vh !important;
        background: linear-gradient(180deg, #fffdf0f7 0 54%, #fffdf055 78%, #fffdf000 100%) !important;
      }
    }
  `;
  document.head.append(responsiveStyle);
  stats.dataset.uiStats = 'true';
  toolbar.dataset.uiToolbar = 'true';
  menu.dataset.uiMenu = 'true';

  shell.append(stats, toolbar, warning, menu);
  updateUi();
};

export const showMenu = () => {
  menu.style.opacity = 1;
  menu.style.pointerEvents = 'auto';
};

export const hideMenu = () => {
  menu.style.opacity = 0;
  menu.style.pointerEvents = 'none';
  stats.style.opacity = 1;
};

export const updateUi = (noCanals = false) => {
  const averageWater = fields.length
    ? fields.reduce((sum, field) => sum + field.moisture, 0) / fields.length
    : 0;

  scoreValue.textContent = state.score;
  canalValue.textContent = state.canalStock;
  seasonValue.textContent = seasonNames[Math.floor(state.tick / 900) % seasonNames.length];
  waterValue.textContent = `${Math.round(averageWater)}%`;
  waterFill.style.width = `${averageWater}%`;
  waterFill.style.background = averageWater < 24 ? colors.warning : colors.canal;

  if (pauseButton) setButtonIcon(pauseButton, state.paused ? 'play' : 'pause', state.paused ? 'Resume' : 'Pause');
  if (gridButton) {
    gridButton.style.background = state.gridLocked ? '#e7f7fb' : '#fffdf0e8';
  }
  if (deleteButton) {
    deleteButton.style.background = state.deleteMode ? '#ffe1d9' : '#fffdf0e8';
    deleteButton.style.color = state.deleteMode ? colors.warning : colors.text;
  }
  if (soundButton) setButtonIcon(soundButton, state.soundOn ? 'sound' : 'mute', state.soundOn ? 'Sound on' : 'Sound off');

  if (noCanals) showToast('No canal pieces left', true);
};
