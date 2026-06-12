import { createSvgElement } from './dom.js';

export const assets = {
  heroIsland: '/assets/hero-island.svg',
  islandTexture: '/assets/island-texture.svg',
  cloudBank: '/assets/cloud-bank.svg',
  cloudBankAlt: '/assets/cloud-bank-2.svg',
  rock: '/assets/rock.svg',
  springGlow: '/assets/spring-glow.svg',
  fieldOverlay: '/assets/field-overlay.svg',
  reservoirBody: '/assets/reservoir-body.svg',
  harvestSparkle: '/assets/harvest-sparkle.svg',
};

export const addSvgImage = (parent, href, {
  x,
  y,
  width,
  height,
  opacity = 1,
  className,
}) => {
  const image = createSvgElement('image');
  image.setAttribute('href', href);
  image.setAttribute('x', x);
  image.setAttribute('y', y);
  image.setAttribute('width', width);
  image.setAttribute('height', height);
  image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  image.style.opacity = opacity;
  image.style.pointerEvents = 'none';
  if (className) image.classList.add(className);
  parent.append(image);
  return image;
};
