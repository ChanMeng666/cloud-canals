export const createElement = (tag = 'div') => document.createElement(tag);

export const createSvgElement = (tag = 'svg') => (
  document.createElementNS('http://www.w3.org/2000/svg', tag)
);
