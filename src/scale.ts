/** One local world unit represents 10 metres. */
export const METERS_PER_UNIT = 10;
export const meters = (value: number): number => value / METERS_PER_UNIT;
export const TILE_UNITS = Math.PI * 200 / 192;
/** The width of a one-tile lot: the pad, its fence and the building on it. A little under a tile, so lots never touch. */
export const LOT = 3.1;

export const STREET = {
  lane: meters(3.5),
  shoulder: meters(0.6),
  marking: meters(0.12),
  curbHeight: meters(0.15),
  sidewalk: meters(1.8),
  lampHeight: meters(8),
  signalHeight: meters(4.2),
};

export const HUMAN = {
  height: meters(1.8),
  doorHeight: meters(2.1),
  doorWidth: meters(0.95),
  floorHeight: meters(3.2),
};

/**
 * How tall things are, in real metres (see docs/scale.md). One world unit is 10 m and one tile is 32.7 m, so a lot holds one
 * building. The town model reads these, and so should every model made for the game.
 */
export const BUILDING_HEIGHT = {
  cottage: 7,
  terrace: 12,
  lowBlock: 27,
  midRise: 54,
  tower: 115,
  /** The tallest a Metropolis core may be. */
  coreCap: 150,
};
/** A ground floor with a shopfront is taller than the floors above it. */
export const SHOP_FLOOR_HEIGHT = 4.5;
/** Storeys in a building of this height: a shopfront ground floor, then ordinary floors. */
export const storeys = (heightMetres: number): number => Math.max(1, 1 + Math.round((heightMetres - SHOP_FLOOR_HEIGHT) / 3.2));

export const ROAD_VEHICLE = {
  width: meters(2.55),
  height: meters(4),
  boxLength: meters(8),
  rigidLength: meters(10),
  semiLength: meters(18),
};

export interface LightAnchor {
  x: number;
  y: number;
  z: number;
  range: number;
  power: number;
}

export const SPORTS = {
  football: { length: 109.728, width: 48.768 },
  hockey: { length: 60.96, width: 25.908 },
  baseball: { basePath: 27.432, mound: 18.4404 },
  soccer: { length: 105, width: 68 },
};
