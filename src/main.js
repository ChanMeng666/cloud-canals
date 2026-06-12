import { initBoard, clearBoardLayers, setGridVisible } from './board.js';
import { renderCanals, rebuildWaterNetwork } from './canal.js';
import { initInput } from './input.js';
import {
  fields, reservoirs, springs, state, resetState,
} from './state.js';
import { createInitialScene, updateSpawning } from './spawning.js';
import {
  hideMenu, initUi, showMenu, showToast, updateUi,
} from './ui.js';
import { initProgression, updateProgression } from './progression.js';
import { updateMusicMood } from './audio.js';

let lastTime = 0;
let accumulator = 0;
const fixedStepMs = 1000 / 60;

const buildScene = () => {
  clearBoardLayers();
  createInitialScene();
  initProgression();
  rebuildWaterNetwork({ springs, reservoirs });
  renderCanals();
  updateUi();
};

const restartGame = () => {
  resetState();
  buildScene();
  state.running = true;
  hideMenu();
  setGridVisible(state.gridLocked);
  updateUi();
};

const startGame = () => {
  restartGame();
};

const togglePause = () => {
  if (!state.running) return;
  state.paused = !state.paused;
  updateUi();
};

const update = () => {
  if (!state.running || state.paused) return;

  state.tick++;

  rebuildWaterNetwork({ springs, reservoirs });
  reservoirs.forEach((reservoir) => reservoir.update());
  rebuildWaterNetwork({ springs, reservoirs });
  fields.forEach((field) => field.update());
  updateProgression().forEach((message) => showToast(message));

  const averageWater = fields.length
    ? fields.reduce((sum, field) => sum + field.moisture, 0) / fields.length
    : 0;
  updateMusicMood(averageWater);

  if (state.tick % 12 === 0) renderCanals();
  if (state.tick % 20 === 0) updateUi();

  updateSpawning();
};

const frame = (time) => {
  if (!lastTime) lastTime = time;
  accumulator += time - lastTime;
  lastTime = time;

  while (accumulator >= fixedStepMs) {
    update();
    accumulator -= fixedStepMs;
  }

  requestAnimationFrame(frame);
};

initBoard();
initUi({ startGame, restartGame, togglePause });
initInput();
resetState();
buildScene();
showMenu();
setGridVisible(state.gridLocked);
requestAnimationFrame(frame);
