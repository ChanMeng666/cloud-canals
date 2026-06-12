import {
  cellSize, layers, svgHeight, svgWidth,
} from './board.js';
import { addSvgImage, assets } from './assets.js';
import { createSvgElement } from './dom.js';
import { decorClouds } from './state.js';

const random = (min, max) => min + Math.random() * (max - min);

class DriftCloud {
  constructor({
    x,
    y,
    width,
    speed,
    opacity,
    asset,
    phase,
  }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = width * random(0.34, 0.44);
    this.speed = speed;
    this.opacity = opacity;
    this.phase = phase;
    this.group = createSvgElement('g');
    this.group.style.pointerEvents = 'none';
    this.group.style.opacity = opacity;

    addSvgImage(this.group, asset, {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      opacity: 1,
    });

    layers.sky.append(this.group);
    decorClouds.push(this);
    this.render();
  }

  render() {
    const bob = Math.sin(this.phase) * cellSize * 0.14;
    this.group.setAttribute('transform', `translate(${this.x} ${this.y + bob})`);
  }

  update() {
    this.x += this.speed;
    this.phase += 0.007;
    if (this.x > svgWidth + this.width) {
      this.x = -this.width - random(20, 120);
      this.y = random(0.8, 20) * cellSize;
    }
    this.render();
  }
}

export const createWeather = () => {
  const presets = [
    { x: -50, y: 1.1, width: 96, speed: 0.035, opacity: 0.46 },
    { x: 130, y: 3.8, width: 70, speed: 0.026, opacity: 0.34 },
    { x: 360, y: 1.9, width: 116, speed: 0.022, opacity: 0.42 },
    { x: 610, y: 8.6, width: 94, speed: 0.032, opacity: 0.32 },
    { x: 90, y: 17.4, width: 120, speed: 0.018, opacity: 0.25 },
    { x: 520, y: 21.2, width: 92, speed: 0.024, opacity: 0.28 },
  ];

  presets.forEach((cloud, index) => new DriftCloud({
    ...cloud,
    y: Math.min(svgHeight - 60, cloud.y * cellSize),
    asset: index % 2 ? assets.cloudBankAlt : assets.cloudBank,
    phase: index * 1.7,
  }));
};

export const updateWeather = () => {
  decorClouds.forEach((cloud) => cloud.update());
};
