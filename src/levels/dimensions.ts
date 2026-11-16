// Тайные комнаты и карманные измерения (1–3 экрана). Из каждого есть выход обратно в ту же точку уровня.
import { Rng } from '../engine/rng';
import { border, fillRect, findFree, room, scatter } from '../engine/gen';
import { type GameMap, newMap, setTile } from '../engine/types';
import { makeActor } from '../entities/actors';

function withReturn(m: GameMap, x: number, y: number) {
  setTile(m, x, y, 'exit');
  m.exits.push({ x, y, to: '__return', label: 'Назад' });
  m.isDimension = true;
}

function loot(m: GameMap, rng: Rng, list: [string, number][], on = ['floor', 'grass', 'snow', 'cloud', 'stage', 'dirt', 'sand', 'tile']) {
  for (const [item, qty] of list) {
    const p = findFree(m, rng, on as any, undefined, (x, y) => m.items.some((i) => i.x === x && i.y === y) || m.exits.some((e) => e.x === x && e.y === y));
    m.items.push({ x: p.x, y: p.y, item, qty });
  }
}

/** Небольшая тайная комната (труба, яма, ложная стена, дверь в воздухе). */
export function secretRoom(id: string, name: string, rng: Rng, style: 'cave' | 'room' | 'bunker' | 'sky' | 'drain', items: [string, number][], enemies: string[] = []): GameMap {
  const fill = style === 'cave' ? 'dirt' : style === 'sky' ? 'cloud' : style === 'drain' ? 'water' : 'floor';
  const m = newMap(id, name, 20, 12, 'void');
  m.light = style === 'sky' ? 'bright' : 'dim';
  m.music = 'dim_rogue';
  if (style === 'sky') {
    fillRect(m, 1, 1, 18, 10, 'cloud');
  } else {
    room(m, 1, 1, 18, 10, fill as any, 'wall');
    if (style === 'cave') scatter(m, rng, 'bush', 10, ['dirt']);
    if (style === 'drain') fillRect(m, 2, 2, 16, 3, 'sand');
  }
  m.start = { x: 3, y: 3 };
  withReturn(m, 2, 2);
  loot(m, rng, items);
  for (const e of enemies) {
    const p = findFree(m, rng, [fill as any, 'dirt', 'floor'], [8, 3, 9, 6]);
    m.actors.push(makeActor(e, p.x, p.y));
  }
  m.music = style === 'sky' ? 'dim_sky' : 'dim_rogue';
  return m;
}

// ─── измерения Уровня 1
export function dimCats(rng: Rng): GameMap {
  const m = newMap('dim_cats', 'Мир Рыжих Котов', 36, 20, 'grass');
  m.palette = 'pink';
  m.light = 'bright';
  m.music = 'dim_cats';
  border(m, 'orange');
  scatter(m, rng, 'flower', 60, ['grass']);
  setTile(m, 18, 3, 'throne');
  m.props.push({ x: 18, y: 3, id: 'throne', name: 'кошачий трон' });
  for (let i = 0; i < 6; i++) {
    const p = findFree(m, rng, ['grass'], [4, 6, 28, 10]);
    const c = makeActor('cat_king', p.x, p.y, { name: 'Кот размером с дом', color: rng.pick(['#ff8c1a', '#ffa040', '#ff7000']) });
    c.tags.delete('king');
    c.data.home = p;
    m.actors.push(c);
  }
  m.start = { x: 3, y: 17 };
  withReturn(m, 2, 17);
  loot(m, rng, [['memory_coin', 3], ['mammoth', 1], ['cassette', 1]]);
  return m;
}

export function dimSom(rng: Rng): GameMap {
  const m = newMap('dim_som', 'Подводное царство Сомика', 34, 20, 'sand');
  m.palette = 'cold';
  m.light = 'bright';
  m.music = 'dim_som';
  border(m, 'reeds');
  scatter(m, rng, 'reeds', 40, ['sand']);
  scatter(m, rng, 'water', 80, ['sand']);
  const s = makeActor('som', 17, 8, { name: 'Сомик (здесь он говорит)' });
  s.ai = 'still';
  s.data.dimension = true;
  m.actors.push(s);
  m.start = { x: 3, y: 16 };
  withReturn(m, 2, 17);
  loot(m, rng, [['memory_coin', 2], ['pebble', 1], ['coin_roman', 1]], ['sand']);
  m.flags.somTask = true;
  return m;
}

export function dimFrost(rng: Rng): GameMap {
  const m = newMap('dim_frost', 'Мамонтова мерзлота', 36, 20, 'snow');
  m.palette = 'cold';
  m.light = 'bright';
  m.music = 'dim_frost';
  border(m, 'ice');
  scatter(m, rng, 'ice', 50, ['snow']);
  fillRect(m, 22, 6, 6, 5, 'ice');
  m.actors.push(makeActor('mammoth_ice', 24, 8));
  m.start = { x: 3, y: 16 };
  withReturn(m, 2, 17);
  loot(m, rng, [['mammoth', 2], ['memory_coin', 2]], ['snow']);
  for (let i = 0; i < 3; i++) {
    const p = findFree(m, rng, ['snow'], [10, 3, 22, 14]);
    m.actors.push(makeActor('jackal', p.x, p.y, { name: 'Снежный волк', color: '#e0f0ff', tags: new Set() }));
  }
  return m;
}

export function dimRock(rng: Rng): GameMap {
  const m = newMap('dim_rock', 'Рок-измерение', 36, 20, 'stage');
  m.light = 'bright';
  m.music = 'dim_rock';
  border(m, 'amp');
  fillRect(m, 4, 2, 28, 4, 'wood');
  for (let x = 4; x < 32; x += 4) setTile(m, x, 2, 'amp');
  m.props.push({ x: 18, y: 3, id: 'rock_stage', name: 'сцена (сыграть ритм-челлендж)' });
  for (let i = 0; i < 14; i++) {
    const p = findFree(m, rng, ['stage'], [3, 8, 30, 10]);
    m.actors.push(makeActor('fan', p.x, p.y));
  }
  m.start = { x: 3, y: 17 };
  withReturn(m, 2, 17);
  loot(m, rng, [['cassette', 2], ['memory_coin', 2]], ['stage']);
  return m;
}

export function dimSky(rng: Rng): GameMap {
  const m = newMap('dim_sky', 'Небо реактивных самолётов', 40, 18, 'void');
  m.light = 'bright';
  m.music = 'dim_sky';
  for (let i = 0; i < 9; i++) {
    const cx = 3 + i * 4, cy = rng.int(5, 12);
    fillRect(m, cx, cy - 1, 4, 3, 'cloud');
    if (i > 0) fillRect(m, cx - 1, cy, 2, 1, 'cloud');
  }
  fillRect(m, 1, 8, 38, 1, 'cloud');
  for (let i = 0; i < 4; i++) {
    const j = makeActor('jet', 6 + i * 8, 3);
    j.ai = 'still';
    m.actors.push(j);
  }
  m.start = { x: 3, y: 8 };
  withReturn(m, 2, 8);
  loot(m, rng, [['memory_coin', 4], ['binoculars', 1]], ['cloud']);
  return m;
}

export function dimRogue(rng: Rng): GameMap {
  const m = newMap('dim_rogue', 'Перевёрнутый мир', 40, 22, 'void');
  m.palette = 'mono';
  m.light = 'dim';
  m.music = 'dim_rogue';
  const rooms: [number, number, number, number][] = [[2, 2, 10, 7], [16, 3, 10, 6], [28, 2, 10, 8], [4, 13, 12, 7], [22, 12, 14, 8]];
  for (const [x, y, w, h] of rooms) room(m, x, y, w, h, 'floor', 'wall');
  const cor = (x1: number, y1: number, x2: number, y2: number) => {
    let x = x1, y = y1;
    while (x !== x2) {
      setTile(m, x, y, 'dirt');
      x += Math.sign(x2 - x);
    }
    while (y !== y2) {
      setTile(m, x, y, 'dirt');
      y += Math.sign(y2 - y);
    }
    setTile(m, x, y, 'dirt');
  };
  cor(11, 5, 16, 5);
  cor(25, 5, 28, 5);
  cor(7, 8, 7, 13);
  cor(15, 16, 22, 16);
  cor(32, 9, 32, 12);
  m.start = { x: 4, y: 4 };
  withReturn(m, 3, 3);
  for (let i = 0; i < 5; i++) {
    const p = findFree(m, rng, ['floor'], [16, 3, 22, 17]);
    m.actors.push(makeActor('rogue_kobold', p.x, p.y));
  }
  m.items.push({ x: 30, y: 16, item: 'memory_coin', qty: 5 });
  m.items.push({ x: 33, y: 5, item: 'mammoth', qty: 1 });
  m.props.push({ x: 34, y: 17, id: 'amulet', name: 'Амулет Йендора (почти)' });
  setTile(m, 34, 17, 'throne');
  return m;
}
