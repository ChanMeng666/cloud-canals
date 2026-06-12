import {
  cellCenter,
  cellSize,
  eventToCell,
  isInsideBoard,
  layers,
  panCameraByScreenDelta,
  setGridVisible,
  zoomCameraAt,
} from './board.js';
import { createSvgElement } from './dom.js';
import {
  addCanal, getCanalAt, removeCanalsTouching, renderCanals,
} from './canal.js';
import { isBlockedCell } from './stations.js';
import { maxCanalStock, state } from './state.js';
import { sounds } from './audio.js';
import { showToast, updateUi } from './ui.js';
import { colors } from './colors.js';

let dragging = false;
let lastCell = null;
let panning = false;
let panStart = null;
let spacePanning = false;
const activeTouches = new Map();
let touchGesture = null;
const previewPath = createSvgElement('path');
const targetCell = createSvgElement('rect');

const isNeighbor = (a, b) => (
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1
);

const canBuildCell = (cell) => isInsideBoard(cell) && !isBlockedCell(cell);

const setCursorForCell = (cell) => {
  if (panning) {
    layers.pointer.style.cursor = 'grabbing';
    return;
  }
  if (spacePanning || state.panMode) {
    layers.pointer.style.cursor = 'grab';
    return;
  }
  layers.pointer.style.cursor = canBuildCell(cell) ? 'crosshair' : 'not-allowed';
};

const ensureTargetCell = () => {
  if (!targetCell.parentNode) layers.marker.append(targetCell);
};

const updateTargetCell = (cell) => {
  ensureTargetCell();
  if (!isInsideBoard(cell)) {
    targetCell.style.opacity = 0;
    return;
  }
  targetCell.setAttribute('x', cell.x * cellSize + 2);
  targetCell.setAttribute('y', cell.y * cellSize + 2);
  targetCell.setAttribute('fill', canBuildCell(cell) ? '#ffffff4f' : '#f06b4f33');
  targetCell.setAttribute('stroke', canBuildCell(cell) ? '#2f96baaa' : '#f06b4faa');
  targetCell.style.opacity = 1;
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
  state.canalStock = Math.min(maxCanalStock, state.canalStock + removed.length);
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

const touchPoints = () => [...activeTouches.values()];

const touchCenter = (points) => ({
  x: (points[0].x + points[1].x) / 2,
  y: (points[0].y + points[1].y) / 2,
});

const touchDistance = (points) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);

const beginTouchGesture = () => {
  const points = touchPoints();
  if (points.length < 2) return;
  const center = touchCenter(points);
  touchGesture = {
    center,
    distance: touchDistance(points),
  };
  panning = true;
  dragging = false;
  lastCell = null;
  hidePreview();
  if (!state.gridLocked) setGridVisible(false);
  layers.pointer.style.cursor = 'grabbing';
};

const updateTouchGesture = () => {
  const points = touchPoints();
  if (points.length < 2) return false;
  const center = touchCenter(points);
  const distance = touchDistance(points);
  if (!touchGesture) {
    beginTouchGesture();
    return true;
  }
  panCameraByScreenDelta(center.x - touchGesture.center.x, center.y - touchGesture.center.y);
  if (touchGesture.distance > 0 && distance > 0) {
    zoomCameraAt(center.x, center.y, distance / touchGesture.distance);
  }
  touchGesture = { center, distance };
  return true;
};

const handlePointerDown = (event) => {
  if (!state.running) return;
  event.preventDefault();
  layers.pointer.setPointerCapture(event.pointerId);
  if (event.pointerType === 'touch') {
    activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activeTouches.size >= 2) {
      beginTouchGesture();
      return;
    }
  }
  const cell = eventToCell(event);

  if (event.button === 1 || event.button === 2 || event.shiftKey || spacePanning || state.panMode) {
    panning = true;
    panStart = { x: event.clientX, y: event.clientY };
    dragging = false;
    lastCell = null;
    hidePreview();
    if (!state.gridLocked) setGridVisible(false);
    layers.pointer.style.cursor = 'grabbing';
    return;
  }

  if (state.paused) return;
  setCursorForCell(cell);

  if (state.deleteMode) {
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
  if (event.pointerType === 'touch' && activeTouches.has(event.pointerId)) {
    activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activeTouches.size >= 2 && updateTouchGesture()) return;
  }
  if (panning && panStart) {
    event.preventDefault();
    panCameraByScreenDelta(event.clientX - panStart.x, event.clientY - panStart.y);
    panStart = { x: event.clientX, y: event.clientY };
    targetCell.style.opacity = 0;
    return;
  }
  if (state.paused) return;

  const cell = eventToCell(event);
  setCursorForCell(cell);
  updateTargetCell(cell);

  if (event.buttons === 1 && state.deleteMode) {
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
  if (event.pointerType === 'touch') {
    activeTouches.delete(event.pointerId);
    if (activeTouches.size < 2) touchGesture = null;
  }
  panning = false;
  panStart = null;
  dragging = false;
  lastCell = null;
  hidePreview();
  targetCell.style.opacity = 0;
  if (!state.gridLocked) setGridVisible(false);
  const cell = eventToCell(event);
  setCursorForCell(cell);
};

const handleWheel = (event) => {
  event.preventDefault();
  const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
  zoomCameraAt(event.clientX, event.clientY, factor);
};

const handleKeyDown = (event) => {
  if (event.code !== 'Space') return;
  if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
  event.preventDefault();
  spacePanning = true;
  layers.pointer.style.cursor = 'grab';
};

const handleKeyUp = (event) => {
  if (event.code !== 'Space') return;
  spacePanning = false;
  if (!panning) layers.pointer.style.cursor = 'crosshair';
};

export const initInput = () => {
  previewPath.setAttribute('fill', 'none');
  previewPath.setAttribute('stroke-width', 8);
  previewPath.setAttribute('stroke-linecap', 'round');
  previewPath.style.opacity = 0;
  previewPath.style.transition = 'opacity .12s, stroke .12s';
  previewPath.style.pointerEvents = 'none';
  targetCell.setAttribute('width', 14);
  targetCell.setAttribute('height', 14);
  targetCell.setAttribute('rx', 4);
  targetCell.setAttribute('stroke-width', 1.6);
  targetCell.style.opacity = 0;
  targetCell.style.transition = 'opacity .1s, fill .1s, stroke .1s';
  targetCell.style.pointerEvents = 'none';
  layers.marker.append(targetCell);
  layers.marker.append(previewPath);
  layers.pointer.addEventListener('pointerdown', handlePointerDown);
  layers.pointer.addEventListener('pointermove', handlePointerMove);
  layers.pointer.addEventListener('pointerup', handlePointerUp);
  layers.pointer.addEventListener('pointercancel', handlePointerUp);
  layers.pointer.addEventListener('wheel', handleWheel, { passive: false });
  layers.pointer.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
};
