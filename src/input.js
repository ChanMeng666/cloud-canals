import {
  cellCenter, eventToCell, isInsideBoard, layers, setGridVisible,
} from './board.js';
import { createSvgElement } from './dom.js';
import {
  addCanal, getCanalAt, removeCanalsTouching, renderCanals,
} from './canal.js';
import { isBlockedCell } from './stations.js';
import { state } from './state.js';
import { sounds } from './audio.js';
import { showToast, updateUi } from './ui.js';
import { colors } from './colors.js';

let dragging = false;
let lastCell = null;
const previewPath = createSvgElement('path');

const isNeighbor = (a, b) => (
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1
);

const canBuildCell = (cell) => isInsideBoard(cell) && !isBlockedCell(cell);

const setCursorForCell = (cell) => {
  layers.pointer.style.cursor = canBuildCell(cell) ? 'cell' : 'not-allowed';
};

const hidePreview = () => {
  previewPath.style.opacity = 0;
};

const ensurePreview = () => {
  if (!previewPath.parentNode) layers.marker.append(previewPath);
};

const updatePreview = (from, to) => {
  ensurePreview();
  if (!from || !to || !isNeighbor(from, to)) {
    hidePreview();
    return;
  }
  const start = cellCenter(from);
  const end = cellCenter(to);
  const valid = canBuildCell(from) && canBuildCell(to) && !getCanalAt(from, to) && state.canalStock > 0;
  previewPath.setAttribute('d', `M${start.x} ${start.y}L${end.x} ${end.y}`);
  previewPath.setAttribute('stroke', valid ? colors.canalWet : colors.warning);
  previewPath.style.opacity = 0.95;
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
    hidePreview();
    deleteAt(cell);
    return;
  }

  if (!canBuildCell(cell)) {
    sounds.invalid();
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

  updatePreview(lastCell, cell);

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
  hidePreview();
  if (!state.gridLocked) setGridVisible(false);
};

export const initInput = () => {
  previewPath.setAttribute('fill', 'none');
  previewPath.setAttribute('stroke-width', 8);
  previewPath.setAttribute('stroke-linecap', 'round');
  previewPath.style.opacity = 0;
  previewPath.style.transition = 'opacity .12s, stroke .12s';
  previewPath.style.pointerEvents = 'none';
  layers.marker.append(previewPath);
  layers.pointer.addEventListener('pointerdown', handlePointerDown);
  layers.pointer.addEventListener('pointermove', handlePointerMove);
  layers.pointer.addEventListener('pointerup', handlePointerUp);
  layers.pointer.addEventListener('pointercancel', handlePointerUp);
  layers.pointer.addEventListener('contextmenu', (event) => event.preventDefault());
};
