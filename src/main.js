import { initBoard, clearBoardLayers, setGridVisible } from './board.js';
import { renderCanals, rebuildWaterNetwork } from './canal.js';
import { initInput } from './input.js';
import {
  fields, reservoirs, springs, state, resetState,
} from './state.js';
import { createInitialScene, updateSpawning } from './spawning.js';
import {
  hideMenu, initUi, showMenu, updateUi,
} from './ui.js';

let lastTime = 0;
let accumulator = 0;
const fixedStepMs = 1000 / 60;

const buildScene = () => {
  clearBoardLayers();
  createInitialScene();
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
