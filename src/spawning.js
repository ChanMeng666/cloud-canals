import {
  boardHeight, boardWidth, cellKey,
} from './board.js';
import { addCanal, isCanalCell } from './canal.js';
import {
  Blocker, Field, Reservoir, Spring, areaIsFree, isBlockedCell,
} from './stations.js';
import { fields, reservoirs, state } from './state.js';
import { showToast } from './ui.js';

const randomInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

const connectorCandidates = ({ x, y, width, height }) => [
  { x: x - 1, y: y + Math.floor(height / 2) },
  { x: x + width, y: y + Math.floor(height / 2) },
  { x: x + Math.floor(width / 2), y: y - 1 },
  { x: x + Math.floor(width / 2), y: y + height },
];

const chooseConnector = (area) => connectorCandidates(area)
  .filter((cell) => (
    cell.x >= 0
    && cell.y >= 0
    && cell.x < boardWidth
    && cell.y < boardHeight
    && !isBlockedCell(cell)
    && !isCanalCell(cell)
  ))
  .sort(() => Math.random() - 0.5)[0];

const canalTouchesArea = ({ x, y, width, height }, connectors = []) => {
  const cells = [];
  for (let cx = x; cx < x + width; cx++) {
    for (let cy = y; cy < y + height; cy++) cells.push({ x: cx, y: cy });
  }
  return [...cells, ...connectors].some(isCanalCell);
};

const findFreeArea = ({
  width,
  height,
  attempts = 60,
  margin = 1,
}) => {
  for (let i = 0; i < attempts; i++) {
    const area = {
      x: randomInt(margin, boardWidth - width - margin),
      y: randomInt(margin, boardHeight - height - margin),
      width,
      height,
    };
    const connector = chooseConnector(area);
    if (!connector) continue;
    if (!areaIsFree({ ...area, connectors: [connector] })) continue;
    if (canalTouchesArea(area, [connector])) continue;
    return { ...area, connectors: [connector] };
  }
  return null;
};

const spawnBlocker = () => {
  const rock = Math.random() > 0.55;
  const width = rock ? 1 : randomInt(1, 2);
  const height = rock ? 1 : randomInt(1, 2);

  for (let i = 0; i < 40; i++) {
    const area = {
      x: randomInt(1, boardWidth - width - 2),
      y: randomInt(1, boardHeight - height - 2),
      width,
      height,
      connectors: [],
    };
    if (!areaIsFree(area)) continue;
    if (canalTouchesArea(area)) continue;
    new Blocker({ ...area, type: rock ? 'rock' : 'cloud' });
    return true;
  }
  return false;
};

export const createInitialScene = () => {
  new Spring({
    x: 3,
    y: 7,
    connectors: [{ x: 5, y: 8 }],
  });

  addCanal({ x: 5, y: 8 }, { x: 6, y: 8 });

  new Field({
    x: 11,
    y: 5,
    connectors: [{ x: 10, y: 6 }],
  });

  new Field({
    x: 18,
    y: 10,
    connectors: [{ x: 17, y: 11 }],
  });

  [
    { x: 8, y: 3, width: 2, height: 1, type: 'cloud' },
    { x: 14, y: 8, width: 1, height: 1, type: 'rock' },
    { x: 22, y: 6, width: 2, height: 2, type: 'cloud' },
    { x: 6, y: 12, width: 1, height: 1, type: 'rock' },
  ].forEach((blocker) => new Blocker(blocker));
};

export const spawnField = () => {
  const area = findFreeArea({
    width: 3,
    height: 2,
    attempts: 80,
  });
  if (!area) return false;
  new Field(area);
  return true;
};

export const spawnReservoir = () => {
  const area = findFreeArea({
    width: 2,
    height: 2,
    attempts: 80,
  });
  if (!area) return false;
  new Reservoir(area);
  return true;
};

export const updateSpawning = () => {
  if (state.tick < state.nextSpawnTick) return;

  const spawnReservoirNext = fields.length > reservoirs.length * 3;
  const spawned = (
    spawnReservoirNext
      ? spawnReservoir()
      : spawnField()
  );

  if (spawned) {
    state.canalStock = Math.min(80, state.canalStock + 7);
    showToast(`${spawnReservoirNext ? 'New reservoir' : 'New field'} appeared. Canals +7`);
    if (Math.random() > 0.35) spawnBlocker();
  }

  state.nextSpawnTick = state.tick + 1100 + Math.floor(Math.random() * 700);
};

export const occupiedKeys = () => {
  const keys = new Set();
  for (let x = 0; x < boardWidth; x++) {
    for (let y = 0; y < boardHeight; y++) {
      const cell = { x, y };
      if (isBlockedCell(cell)) keys.add(cellKey(cell));
    }
  }
  return keys;
};
