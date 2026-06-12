import { cellCenter, cellKey, cellSize, isInsideBoard, layers } from './board.js';
import { colors } from './colors.js';
import { createSvgElement } from './dom.js';
import {
  blockers, fields, reservoirs, springs, state, stations,
} from './state.js';
import { hasWaterAt } from './canal.js';
import { sounds } from './audio.js';

const allCellsInArea = ({ x, y, width, height }) => {
  const cells = [];
  for (let cx = x; cx < x + width; cx++) {
    for (let cy = y; cy < y + height; cy++) cells.push({ x: cx, y: cy });
  }
  return cells;
};

const setAttrs = (element, attrs) => {
  Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
};

export class Station {
  constructor({
    x,
    y,
    width,
    height,
    connectors,
    color,
    label,
  }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.connectors = connectors;
    this.color = color;
    this.label = label;
    this.cells = allCellsInArea(this);
    this.group = createSvgElement('g');
    stations.push(this);
  }

  addBase() {
    const x = this.x * cellSize + 2;
    const y = this.y * cellSize + 2;
    const width = this.width * cellSize - 4;
    const height = this.height * cellSize - 4;

    const shadow = createSvgElement('rect');
    setAttrs(shadow, {
      x: x + 2,
      y: y + 3,
      width,
      height,
      rx: 8,
      fill: colors.shade,
    });

    const base = createSvgElement('rect');
    setAttrs(base, {
      x,
      y,
      width,
      height,
      rx: 8,
      fill: this.color,
      stroke: colors.text,
      'stroke-width': 1.2,
      opacity: 0.94,
    });

    this.group.append(shadow, base);
    layers.station.append(this.group);

    this.connectors.forEach((connector) => {
      const center = cellCenter(connector);
      const dot = createSvgElement('circle');
      setAttrs(dot, {
        cx: center.x,
        cy: center.y,
        r: 4,
        fill: colors.panel,
        stroke: this.color,
        'stroke-width': 2,
      });
      layers.marker.append(dot);
    });
  }

  isWatered() {
    return this.connectors.some((connector) => hasWaterAt(connector));
  }

  update() {}
}

export class Spring extends Station {
  constructor(props) {
    super({
      ...props,
      width: 2,
      height: 2,
      color: colors.spring,
      label: 'spring',
    });
    springs.push(this);
    this.addBase();
    this.addDetail();
  }

  addDetail() {
    const center = {
      x: (this.x + 1) * cellSize,
      y: (this.y + 1) * cellSize,
    };
    const swirl = createSvgElement('path');
    setAttrs(swirl, {
      d: `M${center.x - 11} ${center.y}Q${center.x} ${center.y - 13} ${center.x + 11} ${center.y}Q${center.x} ${center.y + 13} ${center.x - 9} ${center.y + 4}`,
      fill: 'none',
      stroke: colors.springLight,
      'stroke-width': 4,
      'stroke-linecap': 'round',
    });
    this.group.append(swirl);
  }
}

export class Field extends Station {
  constructor(props) {
    super({
      ...props,
      width: 3,
      height: 2,
      color: colors.field,
      label: 'field',
    });
    this.moisture = 20 + Math.random() * 18;
    this.growth = 10 + Math.random() * 18;
    this.warnCooldown = 0;
    fields.push(this);
    this.addBase();
    this.addDetail();
  }

  addDetail() {
    this.rows = [];
    for (let row = 0; row < 3; row++) {
      const path = createSvgElement('path');
      const y = (this.y * cellSize) + 9 + row * 8;
      setAttrs(path, {
        d: `M${this.x * cellSize + 9} ${y}L${(this.x + this.width) * cellSize - 9} ${y}`,
        stroke: colors.islandDark,
        'stroke-width': 3,
        'stroke-linecap': 'round',
        opacity: 0.5,
      });
      this.group.append(path);
      this.rows.push(path);
    }

    this.crop = createSvgElement('rect');
    setAttrs(this.crop, {
      x: this.x * cellSize + 6,
      y: this.y * cellSize + 6,
      width: 0,
      height: this.height * cellSize - 12,
      rx: 5,
      fill: colors.crop,
      opacity: 0.65,
    });
    this.group.append(this.crop);

    const meterX = this.x * cellSize + 6;
    const meterY = this.y * cellSize + this.height * cellSize - 7;
    this.moistureTrack = createSvgElement('rect');
    setAttrs(this.moistureTrack, {
      x: meterX,
      y: meterY,
      width: this.width * cellSize - 12,
      height: 4,
      rx: 2,
      fill: '#24333a22',
    });
    this.moistureBar = createSvgElement('rect');
    setAttrs(this.moistureBar, {
      x: meterX,
      y: meterY,
      width: 0,
      height: 4,
      rx: 2,
      fill: colors.canal,
    });
    this.group.append(this.moistureTrack, this.moistureBar);

    this.warn = createSvgElement('g');
    this.warn.style.opacity = 0;
    this.warn.style.transition = 'opacity .2s';
    const center = cellCenter({ x: this.x + 1, y: this.y });
    const bubble = createSvgElement('circle');
    setAttrs(bubble, {
      cx: center.x,
      cy: center.y - 9,
      r: 7,
      fill: colors.panel,
      stroke: colors.warning,
      'stroke-width': 2,
    });
    const mark = createSvgElement('path');
    setAttrs(mark, {
      d: `M${center.x} ${center.y - 13}L${center.x} ${center.y - 9}M${center.x} ${center.y - 5}L${center.x} ${center.y - 5}`,
      stroke: colors.warning,
      'stroke-width': 2,
      'stroke-linecap': 'round',
    });
    this.warn.append(bubble, mark);
    layers.marker.append(this.warn);
  }

  update() {
    const watered = this.isWatered();
    this.moisture += watered ? 0.22 : -0.08;
    this.moisture = Math.max(0, Math.min(100, this.moisture));

    if (this.moisture > 18) this.growth += 0.075 + (this.moisture / 2600);
    if (this.moisture < 10) this.growth -= 0.018;
    this.growth = Math.max(0, Math.min(100, this.growth));

    if (this.growth >= 100) {
      this.growth = 16;
      this.moisture = Math.max(12, this.moisture - 18);
      state.score++;
      this.flashHarvest();
      sounds.harvest();
    }

    const cropWidth = ((this.width * cellSize - 12) * this.growth) / 100;
    this.crop.setAttribute('width', cropWidth);
    this.crop.setAttribute('fill', watered ? colors.crop : '#b99b52');
    this.moistureBar.setAttribute('width', ((this.width * cellSize - 12) * this.moisture) / 100);
    this.moistureBar.setAttribute('fill', this.moisture < 18 ? colors.warning : colors.canalWet);
    this.warn.style.opacity = this.moisture < 18 ? 1 : 0;

    if (this.moisture < 18 && this.warnCooldown <= 0) {
      sounds.warning();
      this.warnCooldown = 180;
    }
    if (this.warnCooldown > 0) this.warnCooldown--;
  }

  flashHarvest() {
    this.group.style.transition = 'transform .2s';
    this.group.style.transform = 'scale(1.04)';
    this.group.style.transformOrigin = `${(this.x + 1.5) * cellSize}px ${(this.y + 1) * cellSize}px`;
    setTimeout(() => {
      this.group.style.transform = 'scale(1)';
    }, 180);
  }
}

export class Reservoir extends Station {
  constructor(props) {
    super({
      ...props,
      width: 2,
      height: 2,
      color: colors.tank,
      label: 'tank',
    });
    this.storage = 10;
    reservoirs.push(this);
    this.addBase();
    this.addDetail();
  }

  addDetail() {
    this.water = createSvgElement('rect');
    this.water.style.transition = 'height .25s, y .25s, opacity .25s';
    setAttrs(this.water, {
      x: this.x * cellSize + 9,
      y: this.y * cellSize + 25,
      width: this.width * cellSize - 18,
      height: 3,
      rx: 2,
      fill: colors.canalWet,
    });
    this.group.append(this.water);
  }

  update() {
    if (this.isWatered()) this.storage += 0.26;
    else this.storage -= 0.035;
    this.storage = Math.max(0, Math.min(100, this.storage));

    const height = Math.max(3, ((this.height * cellSize - 14) * this.storage) / 100);
    this.water.setAttribute('y', this.y * cellSize + this.height * cellSize - 7 - height);
    this.water.setAttribute('height', height);
    this.water.style.opacity = this.storage > 8 ? 1 : 0.3;
  }
}

export class Blocker {
  constructor({
    x,
    y,
    width = 1,
    height = 1,
    type = 'cloud',
  }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.cells = allCellsInArea(this);
    blockers.push(this);
    this.addToSvg();
  }

  addToSvg() {
    const group = createSvgElement('g');
    layers.station.append(group);

    if (this.type === 'rock') {
      const rect = createSvgElement('rect');
      setAttrs(rect, {
        x: this.x * cellSize + 4,
        y: this.y * cellSize + 4,
        width: this.width * cellSize - 8,
        height: this.height * cellSize - 8,
        rx: 6,
        fill: colors.rock,
        opacity: 0.82,
      });
      group.append(rect);
      return;
    }

    this.cells.forEach((cell, index) => {
      const center = cellCenter(cell);
      const cloud = createSvgElement('ellipse');
      setAttrs(cloud, {
        cx: center.x + (index % 2 ? 4 : -3),
        cy: center.y,
        rx: 9 + Math.random() * 4,
        ry: 6 + Math.random() * 3,
        fill: colors.cloud,
        opacity: 0.88,
      });
      group.append(cloud);
    });
  }
}

export const isBlockedCell = (cell) => {
  if (!isInsideBoard(cell)) return true;
  return stations.some((station) => station.cells.some((blocked) => cellKey(blocked) === cellKey(cell)))
    || blockers.some((blocker) => blocker.cells.some((blocked) => cellKey(blocked) === cellKey(cell)));
};

export const areaIsFree = ({ x, y, width, height, connectors = [] }) => {
  const cells = allCellsInArea({ x, y, width, height });
  if (!cells.every(isInsideBoard) || !connectors.every(isInsideBoard)) return false;

  const blockedKeys = new Set([
    ...stations.flatMap((station) => station.cells.map(cellKey)),
    ...blockers.flatMap((blocker) => blocker.cells.map(cellKey)),
  ]);

  return cells.every((cell) => !blockedKeys.has(cellKey(cell)))
    && connectors.every((cell) => !blockedKeys.has(cellKey(cell)));
};
