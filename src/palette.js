// The style bible's palette. Warm means alive, cool means passing,
// desaturated means gone. Gold is the only colour in every scene.
import { hexToLinear } from './math.js';

export const HEX = {
  black: '#050407',
  gold: '#D4A24C',
  goldHi: '#F6E3B0',
  amber: '#E8892B',
  crimson: '#C2362F',
  magenta: '#B0386A',
  violet: '#5B3F8C',
  teal: '#2E7F8F',
  slate: '#3E5A70',
  bone: '#E9E2D0',
  ash: '#8A8A8A',
};

export const LIN = Object.fromEntries(Object.entries(HEX).map(([k, v]) => [k, hexToLinear(v)]));
