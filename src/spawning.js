import {
  boardHeight, boardWidth, cellKey, isInsideBoard,
} from './board.js';
import { addCanal, isCanalCell } from './canal.js';
import {
  Blocker, Field, Reservoir, Spring, areaIsFree, isBlockedCell,
} from './stations.js';
import {
  blockers, canals, fields, maxCanalStock, reservoirs, springs, state,
} from './state.js';
import { showToast } from './ui.js';

const randomInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

const allCellsInArea = ({ x, y, width, height }) => {
  const cells = [];
  for (let cx = x; cx < x + width; cx++) {
    for (let cy = y; cy < y + height; cy++) cells.push({ x: cx, y: cy });
  }
  return cells;
};

const neighborsOf = (cell) => [
  { x: cell.x + 1, y: cell.y },
  { x: cell.x - 1, y: cell.y },
  { x: cell.x, y: cell.y + 1 },
  { x: cell.x, y: cell.y - 1 },
];

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
  const cells = allCellsInArea({ x, y, width, height });
  return [...cells, ...connectors].some(isCanalCell);
};

const networkKeys = () => {
  const keys = new Set();
  springs.forEach((spring) => spring.connectors.forEach((connector) => keys.add(cellKey(connector))));
  canals.forEach((segment) => {
    keys.add(cellKey(segment.a));
    keys.add(cellKey(segment.b));
  });
  return keys;
};

const canReachNetwork = (start, futureBlockedKeys = new Set()) => {
  const targets = networkKeys();
  if (!targets.size) return true;

  const queue = [start];
  const visited = new Set();

  while (queue.length) {
    const cell = queue.shift();
    const key = cellKey(cell);
    if (visited.has(key)) continue;
    visited.add(key);
    if (!isInsideBoard(cell)) continue;
    if (futureBlockedKeys.has(key) || isBlockedCell(cell)) continue;
    if (targets.has(key)) return true;
    neighborsOf(cell).forEach((next) => {
      const nextKey = cellKey(next);
      if (!visited.has(nextKey)) queue.push(next);
    });
  }

  return false;
};

const importantAccessKeys = () => {
  const keys = networkKeys();
  fields.forEach((field) => field.connectors.forEach((connector) => keys.add(cellKey(connector))));
  reservoirs.forEach((reservoir) => reservoir.connectors.forEach((connector) => keys.add(cellKey(connector))));
  return keys;
};

const hasAccessConflict = (area) => {
  const important = importantAccessKeys();
  return allCellsInArea(area).some((cell) => {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (Math.abs(dx) + Math.abs(dy) > 1) continue;
        if (important.has(cellKey({ x: cell.x + dx, y: cell.y + dy }))) return true;
      }
    }
    return false;
  });
};

const keepsStationsReachable = (futureBlockedKeys) => (
  [...fields, ...reservoirs].every((station) => (
    station.connectors.some((connector) => canReachNetwork(connector, futureBlockedKeys))
  ))
);

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
    if (!canReachNetwork(connector, new Set(allCellsInArea(area).map(cellKey)))) continue;
    return { ...area, connectors: [connector] };
  }
  return null;
};

const spawnBlocker = () => {
  if (blockers.length > 20) return false;

  const rock = Math.random() > 0.72;
  const width = rock ? 1 : randomInt(1, 2);
  const height = rock ? 1 : randomInt(1, 2);

  for (let i = 0; i < 70; i++) {
    const area = {
      x: randomInt(1, boardWidth - width - 2),
      y: randomInt(1, boardHeight - height - 2),
      width,
      height,
      connectors: [],
    };
    if (!areaIsFree(area)) continue;
    if (canalTouchesArea(area)) continue;
    if (hasAccessConflict(area)) continue;
    const futureBlockedKeys = new Set(allCellsInArea(area).map(cellKey));
    if (!keepsStationsReachable(futureBlockedKeys)) continue;
    new Blocker({
      ...area,
      type: rock ? 'rock' : 'mist',
      ttl: rock ? undefined : 1400 + Math.floor(Math.random() * 900),
    });
    return true;
  }
  return false;
};

export const createInitialScene = () => {
  new Spring({
    x: 4,
    y: 12,
    connectors: [{ x: 6, y: 13 }],
  });

  addCanal({ x: 6, y: 13 }, { x: 7, y: 13 });
  addCanal({ x: 7, y: 13 }, { x: 8, y: 13 });

  new Field({
    x: 14,
    y: 9,
    connectors: [{ x: 13, y: 10 }],
  });

  new Field({
    x: 26,
    y: 16,
    connectors: [{ x: 25, y: 17 }],
  });

  [
    { x: 10, y: 7, width: 2, height: 1, type: 'mist', ttl: 1800 },
    { x: 19, y: 12, width: 1, height: 1, type: 'rock' },
    { x: 32, y: 8, width: 2, height: 2, type: 'mist', ttl: 2200 },
    { x: 8, y: 19, width: 1, height: 1, type: 'rock' },
    { x: 36, y: 18, width: 2, height: 1, type: 'mist', ttl: 1900 },
  ].forEach((blocker) => new Blocker(blocker));
};

export const spawnField = () => {
  const area = findFreeArea({
    width: 3,
    height: 2,
    attempts: 110,
    margin: 2,
  });
  if (!area) return false;
  new Field(area);
  return true;
};

export const spawnReservoir = () => {
  const area = findFreeArea({
    width: 2,
    height: 2,
    attempts: 110,
    margin: 2,
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
    state.canalStock = Math.min(maxCanalStock, state.canalStock + 8);
    showToast(`${spawnReservoirNext ? 'New reservoir' : 'New field'} appeared. Canals +8`);
    if (Math.random() > 0.35) spawnBlocker();
  }

  state.nextSpawnTick = state.tick + 1200 + Math.floor(Math.random() * 760);
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
