import {
  eventToCell, isInsideBoard, layers, setGridVisible,
} from './board.js';
import {
  addCanal, getCanalAt, removeCanalsTouching, renderCanals,
} from './canal.js';
import { isBlockedCell } from './stations.js';
import { state } from './state.js';
import { sounds } from './audio.js';
import { showToast, updateUi } from './ui.js';

let dragging = false;
let lastCell = null;

const isNeighbor = (a, b) => (
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1
);

const canBuildCell = (cell) => isInsideBoard(cell) && !isBlockedCell(cell);

const setCursorForCell = (cell) => {
  layers.pointer.style.cursor = canBuildCell(cell) ? 'cell' : 'not-allowed';
};

const deleteAt = (cell) => {
  const removed = removeCanalsTouching(cell);
  if (!removed.length) return;
  state.canalStock = Math.min(80, state.canalStock + removed.length);
  sounds.delete();
  renderCanals();
  updateUi();
};

const buildBetween = (from, to) => {
  if (!isNeighbor(from, to)) return false;
  if (!canBuildCell(from) || !canBuildCell(to)) return false;
  if (getCanalAt(from, to)) return false;

  if (state.canalStock <= 0) {
    updateUi(true);
    return false;
  }

  if (!addCanal(from, to)) return false;
  state.canalStock--;
  sounds.build();
  renderCanals();
  updateUi();
  return true;
};

const handlePointerDown = (event) => {
  if (!state.running) return;
  event.preventDefault();
  layers.pointer.setPointerCapture(event.pointerId);
  const cell = eventToCell(event);
  setCursorForCell(cell);

  if (event.button === 2 || state.deleteMode) {
    setGridVisible(true);
    deleteAt(cell);
    return;
  }

  if (!canBuildCell(cell)) {
    showToast('Canals cannot be built here', true);
    return;
  }

  dragging = true;
  lastCell = cell;
  setGridVisible(true);
};

const handlePointerMove = (event) => {
  if (!state.running) return;
  const cell = eventToCell(event);
  setCursorForCell(cell);

  if (event.buttons === 2 || (event.buttons === 1 && state.deleteMode)) {
    setGridVisible(true);
    deleteAt(cell);
    return;
  }

  if (!dragging || event.buttons !== 1 || !lastCell) return;

  if (buildBetween(lastCell, cell)) {
    lastCell = cell;
  } else if (isNeighbor(lastCell, cell) && getCanalAt(lastCell, cell)) {
    lastCell = cell;
  }
};

const handlePointerUp = (event) => {
  if (!state.running) return;
  event.preventDefault();
  dragging = false;
  lastCell = null;
  if (!state.gridLocked) setGridVisible(false);
};

export const initInput = () => {
  layers.pointer.addEventListener('pointerdown', handlePointerDown);
  layers.pointer.addEventListener('pointermove', handlePointerMove);
  layers.pointer.addEventListener('pointerup', handlePointerUp);
  layers.pointer.addEventListener('pointercancel', handlePointerUp);
  layers.pointer.addEventListener('contextmenu', (event) => event.preventDefault());
};
