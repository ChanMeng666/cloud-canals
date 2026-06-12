import { createElement, createSvgElement } from './dom.js';
import { colors } from './colors.js';

export const cellSize = 18;
export const boardWidth = 28;
export const boardHeight = 16;
export const svgWidth = boardWidth * cellSize;
export const svgHeight = boardHeight * cellSize;

export const stage = createElement();
export const svg = createSvgElement();

export const layers = {
  terrain: createSvgElement('g'),
  shadow: createSvgElement('g'),
  canal: createSvgElement('g'),
  water: createSvgElement('g'),
  station: createSvgElement('g'),
  marker: createSvgElement('g'),
  pointer: createSvgElement('rect'),
  grid: createSvgElement('rect'),
};

export const initBoard = () => {
  const styles = createElement('style');
  styles.textContent = `
    * { box-sizing: border-box; }
    :root {
      color-scheme: light;
      --ui-blur: blur(18px) saturate(1.12);
    }
    body {
      margin: 0;
      overflow: hidden;
      color: ${colors.text};
      font-family: ui-rounded, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: ${colors.sky};
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }
    button {
      border: 0;
      color: ${colors.text};
      background: #fffdf0e8;
      box-shadow: 0 10px 30px #24444b18, 0 0 0 1px #24444b18;
      border-radius: 999px;
      font: 850 15px/1 system-ui;
      min-height: 42px;
      padding: 0 16px;
      transition: transform .15s, box-shadow .15s, opacity .3s, background .2s;
    }
    button:hover { box-shadow: 0 14px 34px #24444b24, 0 0 0 1px #24444b24; }
    button:active { transform: translateY(1px) scale(.98); box-shadow: 0 6px 18px #24444b18, 0 0 0 1px #24444b22; }
    button:focus-visible { outline: 3px solid #55a9c955; outline-offset: 3px; }
    svg { shape-rendering: geometricPrecision; }
    @media (max-width: 720px) {
      button { min-height: 40px; padding: 0 13px; }
    }
  `;
  document.head.append(styles);

  stage.style.cssText = `
    position:absolute;
    inset:0;
    display:grid;
    place-items:center;
    overflow:hidden;
    background:
      radial-gradient(circle at 16% 20%, #ffffffa8 0 7%, #0000 8%),
      radial-gradient(circle at 82% 72%, #ffffff7a 0 9%, #0000 10%),
      radial-gradient(circle at 54% 44%, #e9fbff 0 14%, #0000 32%),
      linear-gradient(160deg, ${colors.farSky}, ${colors.sky} 62%, #7cc2d2);
  `;
  document.body.append(stage);

  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.cssText = `
    width: min(100vw, ${boardWidth / boardHeight * 100}vh);
    height: min(100vh, ${boardHeight / boardWidth * 100}vw);
    max-width: 100vw;
    max-height: 100vh;
    touch-action: none;
    filter: drop-shadow(0 18px 24px #31607144);
  `;
  stage.append(svg);

  const defs = createSvgElement('defs');
  const pattern = createSvgElement('pattern');
  pattern.setAttribute('id', 'grid');
  pattern.setAttribute('width', cellSize);
  pattern.setAttribute('height', cellSize);
  pattern.setAttribute('patternUnits', 'userSpaceOnUse');

  const gridPath = createSvgElement('path');
  gridPath.setAttribute('d', `M${cellSize} 0 0 0 0 ${cellSize}`);
  gridPath.setAttribute('fill', 'none');
  gridPath.setAttribute('stroke', colors.grid);
  gridPath.setAttribute('stroke-width', 1);
  pattern.append(gridPath);
  defs.append(pattern);
  svg.append(defs);

  const island = createSvgElement('rect');
  island.setAttribute('x', 2);
  island.setAttribute('y', 2);
  island.setAttribute('width', svgWidth - 4);
  island.setAttribute('height', svgHeight - 4);
  island.setAttribute('rx', 28);
  island.setAttribute('fill', colors.island);
  island.setAttribute('stroke', colors.islandEdge);
  island.setAttribute('stroke-width', 5);
  layers.terrain.append(island);

  layers.grid.setAttribute('width', svgWidth);
  layers.grid.setAttribute('height', svgHeight);
  layers.grid.setAttribute('fill', 'url(#grid)');
  layers.grid.style.opacity = 0;
  layers.grid.style.transition = 'opacity .2s';

  layers.shadow.setAttribute('stroke-linecap', 'round');
  layers.canal.setAttribute('stroke-linecap', 'round');
  layers.water.setAttribute('stroke-linecap', 'round');
  layers.pointer.setAttribute('width', svgWidth);
  layers.pointer.setAttribute('height', svgHeight);
  layers.pointer.setAttribute('fill', 'transparent');
  layers.pointer.style.cursor = 'cell';
  layers.pointer.style.pointerEvents = 'all';

  svg.append(
    layers.terrain,
    layers.grid,
    layers.shadow,
    layers.canal,
    layers.water,
    layers.station,
    layers.marker,
    layers.pointer,
  );
};

export const clearBoardLayers = () => {
  layers.shadow.innerHTML = '';
  layers.canal.innerHTML = '';
  layers.water.innerHTML = '';
  layers.station.innerHTML = '';
  layers.marker.innerHTML = '';
};

export const cellCenter = ({ x, y }) => ({
  x: x * cellSize + cellSize / 2,
  y: y * cellSize + cellSize / 2,
});

export const cellKey = ({ x, y }) => `${x},${y}`;

export const isInsideBoard = ({ x, y }) => (
  x >= 0 && y >= 0 && x < boardWidth && y < boardHeight
);

export const eventToCell = (event) => {
  const rect = layers.pointer.getBoundingClientRect();
  const scaleX = svgWidth / rect.width;
  const scaleY = svgHeight / rect.height;

  return {
    x: Math.floor((event.clientX - rect.left) * scaleX / cellSize),
    y: Math.floor((event.clientY - rect.top) * scaleY / cellSize),
  };
};

export const setGridVisible = (visible) => {
  layers.grid.style.opacity = visible ? 1 : 0;
};
