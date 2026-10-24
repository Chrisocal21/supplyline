/**
 * Map grid for pointing at places: columns are letters, rows are numbers, each cell is 32 tiles square (A1 is the top left).
 * "K4" means the cell 10 across and 3 down. Inside a cell, tiles are named by their map x and y.
 */
export const GRID_CELL = 32;

const colName = (c: number): string => (c < 26 ? String.fromCharCode(65 + c) : String.fromCharCode(64 + Math.floor(c / 26)) + String.fromCharCode(65 + (c % 26)));

/** The cell a tile is in, such as "K4". */
export const gridId = (x: number, y: number): string => `${colName(Math.floor(x / GRID_CELL))}${Math.floor(y / GRID_CELL) + 1}`;

/** The tile range a cell covers, or null if the name is not a cell. */
export function gridRange(id: string): { x0: number; y0: number; x1: number; y1: number } | null {
  const m = /^([A-Z]{1,2})(\d+)$/.exec(id.trim().toUpperCase());
  if (!m) return null;
  const c = m[1].length === 1 ? m[1].charCodeAt(0) - 65 : (m[1].charCodeAt(0) - 64) * 26 + (m[1].charCodeAt(1) - 65);
  const r = Number(m[2]) - 1;
  return { x0: c * GRID_CELL, y0: r * GRID_CELL, x1: c * GRID_CELL + GRID_CELL - 1, y1: r * GRID_CELL + GRID_CELL - 1 };
}
