// Утилиты процедурной генерации: прямоугольники, дома, клеточный автомат, связность.
import { Rng } from './rng';
import { TILES, type TileId } from './tiles';
import { type GameMap, getTile, setTile, inBounds, idx } from './types';

export function fillRect(m: GameMap, x: number, y: number, w: number, h: number, t: TileId) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setTile(m, i, j, t);
}

export function border(m: GameMap, t: TileId) {
  for (let x = 0; x < m.w; x++) {
    setTile(m, x, 0, t);
    setTile(m, x, m.h - 1, t);
  }
  for (let y = 0; y < m.h; y++) {
    setTile(m, 0, y, t);
    setTile(m, m.w - 1, y, t);
  }
}

/** Комната: стены по периметру, пол внутри. */
export function room(m: GameMap, x: number, y: number, w: number, h: number, floor: TileId = 'floor', wall: TileId = 'wall') {
  fillRect(m, x, y, w, h, wall);
  fillRect(m, x + 1, y + 1, w - 2, h - 2, floor);
}

export function scatter(m: GameMap, rng: Rng, t: TileId, count: number, on: TileId[], area?: [number, number, number, number]) {
  const [ax, ay, aw, ah] = area ?? [1, 1, m.w - 2, m.h - 2];
  let placed = 0;
  for (let tries = 0; tries < count * 30 && placed < count; tries++) {
    const x = rng.int(ax, ax + aw - 1);
    const y = rng.int(ay, ay + ah - 1);
    if (on.includes(getTile(m, x, y))) {
      setTile(m, x, y, t);
      placed++;
    }
  }
}

/** Клеточный автомат для леса: true = дерево. */
export function cellular(w: number, h: number, rng: Rng, fill = 0.45, steps = 4): boolean[] {
  let g = new Array(w * h).fill(false).map(() => rng.chance(fill));
  for (let s = 0; s < steps; s++) {
    const n = g.slice();
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let c = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) c++;
            else if (g[yy * w + xx]) c++;
          }
        n[y * w + x] = c >= 5;
      }
    g = n;
  }
  return g;
}

export function walkable(m: GameMap, x: number, y: number) {
  return TILES[getTile(m, x, y)].walk;
}

/** Поиск в ширину по проходимым клеткам. Возвращает массив «достижимо». */
export function flood(m: GameMap, sx: number, sy: number, passable: (x: number, y: number) => boolean = (x, y) => walkable(m, x, y)): Uint8Array {
  const seen = new Uint8Array(m.w * m.h);
  if (!inBounds(m, sx, sy)) return seen;
  const q: number[] = [sx, sy];
  seen[idx(m, sx, sy)] = 1;
  while (q.length) {
    const y = q.pop()!, x = q.pop()!;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (!inBounds(m, nx, ny)) continue;
        const k = idx(m, nx, ny);
        if (seen[k] || !passable(nx, ny)) continue;
        seen[k] = 1;
        q.push(nx, ny);
      }
  }
  return seen;
}

/** Прорубить тропинку от (x,y) к ближайшей достижимой клетке. */
export function connect(m: GameMap, reach: Uint8Array, x: number, y: number, path: TileId = 'dirt') {
  let best = -1, bd = 1e9;
  for (let j = 1; j < m.h - 1; j++)
    for (let i = 1; i < m.w - 1; i++) {
      if (!reach[idx(m, i, j)]) continue;
      const d = Math.abs(i - x) + Math.abs(j - y);
      if (d < bd) {
        bd = d;
        best = idx(m, i, j);
      }
    }
  if (best < 0) return;
  let tx = best % m.w, ty = Math.floor(best / m.w);
  let cx = x, cy = y;
  while (cx !== tx || cy !== ty) {
    if (!walkable(m, cx, cy)) setTile(m, cx, cy, path);
    if (cx !== tx) cx += Math.sign(tx - cx);
    else cy += Math.sign(ty - cy);
  }
}

/** Гарантирует, что все важные точки достижимы из старта. */
export function ensureReachable(m: GameMap, points: { x: number; y: number }[], path: TileId = 'dirt') {
  for (const p of points) {
    let reach = flood(m, m.start.x, m.start.y);
    if (reach[idx(m, p.x, p.y)]) continue;
    // сама точка может стоять на непроходимой клетке (NPC за столом) — проверяем соседей
    let ok = false;
    for (let dy = -1; dy <= 1 && !ok; dy++)
      for (let dx = -1; dx <= 1 && !ok; dx++) if (inBounds(m, p.x + dx, p.y + dy) && reach[idx(m, p.x + dx, p.y + dy)]) ok = true;
    if (ok) continue;
    connect(m, reach, p.x, p.y, path);
  }
}

export function findFree(m: GameMap, rng: Rng, on: TileId[], area?: [number, number, number, number], avoid?: (x: number, y: number) => boolean): { x: number; y: number } {
  const [ax, ay, aw, ah] = area ?? [1, 1, m.w - 2, m.h - 2];
  for (let t = 0; t < 2000; t++) {
    const x = rng.int(ax, ax + aw - 1), y = rng.int(ay, ay + ah - 1);
    if (on.includes(getTile(m, x, y)) && !m.actors.some((a) => a.x === x && a.y === y) && !(avoid && avoid(x, y))) return { x, y };
  }
  // запасной вариант: первая подходящая клетка
  for (let y = ay; y < ay + ah; y++) for (let x = ax; x < ax + aw; x++) if (on.includes(getTile(m, x, y))) return { x, y };
  return { x: m.start.x, y: m.start.y };
}
