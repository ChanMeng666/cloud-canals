import { cellCenter, cellKey, layers } from './board.js';
import { colors } from './colors.js';
import { createSvgElement } from './dom.js';
import { canals } from './state.js';

let wetCells = new Set();
let cellComponents = new Map();
let wetComponents = new Set();

const segmentKey = (a, b) => {
  const ka = cellKey(a);
  const kb = cellKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
};

export class CanalSegment {
  constructor(a, b) {
    this.a = { x: a.x, y: a.y };
    this.b = { x: b.x, y: b.y };
    this.key = segmentKey(this.a, this.b);
    this.wet = false;
    canals.push(this);
  }
}

export const getCanalAt = (a, b) => canals.find((segment) => segment.key === segmentKey(a, b));

export const addCanal = (a, b) => {
  if (getCanalAt(a, b)) return false;
  new CanalSegment(a, b);
  return true;
};

export const removeCanalsTouching = (cell) => {
  const removed = [];
  for (let i = canals.length - 1; i >= 0; i--) {
    const segment = canals[i];
    if (
      (segment.a.x === cell.x && segment.a.y === cell.y)
      || (segment.b.x === cell.x && segment.b.y === cell.y)
    ) {
      removed.push(segment);
      canals.splice(i, 1);
    }
  }
  return removed;
};

const linePath = (segment) => {
  const a = cellCenter(segment.a);
  const b = cellCenter(segment.b);
  return `M${a.x} ${a.y}L${b.x} ${b.y}`;
};

export const renderCanals = () => {
  layers.shadow.innerHTML = '';
  layers.canal.innerHTML = '';
  layers.water.innerHTML = '';

  canals.forEach((segment) => {
    const shadow = createSvgElement('path');
    shadow.setAttribute('d', linePath(segment));
    shadow.setAttribute('stroke', colors.shade);
    shadow.setAttribute('stroke-width', 10);
    shadow.setAttribute('transform', 'translate(1 2)');
    layers.shadow.append(shadow);

    const bed = createSvgElement('path');
    bed.setAttribute('d', linePath(segment));
    bed.setAttribute('stroke', colors.canalDry);
    bed.setAttribute('stroke-width', 10);
    bed.setAttribute('fill', 'none');
    layers.canal.append(bed);

    const water = createSvgElement('path');
    water.setAttribute('d', linePath(segment));
    water.setAttribute('stroke', segment.wet ? colors.canalWet : colors.canal);
    water.setAttribute('stroke-width', segment.wet ? 5 : 3);
    water.setAttribute('fill', 'none');
    water.style.opacity = segment.wet ? 1 : 0.55;
    water.style.transition = 'stroke .2s, stroke-width .2s, opacity .2s';
    layers.water.append(water);
  });

  const junctions = new Map();
  canals.forEach((segment) => {
    [segment.a, segment.b].forEach((cell) => {
      const key = cellKey(cell);
      junctions.set(key, {
        cell,
        count: (junctions.get(key)?.count ?? 0) + 1,
        wet: wetCells.has(key),
      });
    });
  });

  junctions.forEach(({ cell, count, wet }) => {
    if (count < 2) return;
    const center = cellCenter(cell);
    const circle = createSvgElement('circle');
    circle.setAttribute('cx', center.x);
    circle.setAttribute('cy', center.y);
    circle.setAttribute('r', wet ? 4.5 : 3.5);
    circle.setAttribute('fill', wet ? colors.canalWet : colors.canal);
    layers.water.append(circle);
  });
};

export const rebuildWaterNetwork = ({ springs, reservoirs }) => {
  const neighbors = new Map();
  const addNode = (cell) => {
    const key = cellKey(cell);
    if (!neighbors.has(key)) neighbors.set(key, []);
  };
  const addEdge = (a, b) => {
    addNode(a);
    addNode(b);
    neighbors.get(cellKey(a)).push(cellKey(b));
    neighbors.get(cellKey(b)).push(cellKey(a));
  };

  canals.forEach((segment) => addEdge(segment.a, segment.b));

  cellComponents = new Map();
  wetComponents = new Set();
  let componentId = 0;

  neighbors.forEach((_, startKey) => {
    if (cellComponents.has(startKey)) return;
    const stack = [startKey];
    while (stack.length) {
      const key = stack.pop();
      if (cellComponents.has(key)) continue;
      cellComponents.set(key, componentId);
      neighbors.get(key).forEach((next) => stack.push(next));
    }
    componentId++;
  });

  const markWetByConnector = (connector) => {
    const id = cellComponents.get(cellKey(connector));
    if (id !== undefined) wetComponents.add(id);
  };

  springs.forEach((spring) => spring.connectors.forEach(markWetByConnector));
  reservoirs
    .filter((reservoir) => reservoir.storage > 24)
    .forEach((reservoir) => reservoir.connectors.forEach(markWetByConnector));

  wetCells = new Set();
  canals.forEach((segment) => {
    const component = cellComponents.get(cellKey(segment.a));
    segment.wet = wetComponents.has(component);
    if (segment.wet) {
      wetCells.add(cellKey(segment.a));
      wetCells.add(cellKey(segment.b));
    }
  });
};

export const hasWaterAt = (cell) => {
  const component = cellComponents.get(cellKey(cell));
  return component !== undefined && wetComponents.has(component);
};

export const getComponentAt = (cell) => cellComponents.get(cellKey(cell));

export const isCanalCell = (cell) => canals.some((segment) => (
  (segment.a.x === cell.x && segment.a.y === cell.y)
  || (segment.b.x === cell.x && segment.b.y === cell.y)
));
