// Уровень 1 «Маскерет-Батья: лес за железной дорогой» — генерация зон.
// Сюжетные точки фиксированы сценарием, их позиции частично случайны (каждый забег по-своему).
import type { Game } from '../../engine/game';
import { Rng } from '../../engine/rng';
import { border, cellular, ensureReachable, fillRect, findFree, room, scatter } from '../../engine/gen';
import { type GameMap, type Secret, DIRS8, getTile, newMap, setTile } from '../../engine/types';
import { TILES, type TileId } from '../../engine/tiles';
import { makeActor } from '../../entities/actors';

export const HEB = {
  town: { he: 'מזכרת בתיה — נוסדה ב־1883', tr: 'Мазкерет Батья — носда бе-1883', ru: 'Маскерет-Батья — населённый пункт основан в 1883 году' },
  dog: { he: '!זהירות! כלב נושך', tr: 'Зехирут! Келев ношех!', ru: 'Осторожно! Кусачая собака!' },
  cafe: { he: 'בית קפה', tr: 'Бейт кафе', ru: 'Кафе' },
  rail: { he: '!עצור! מסילת ברזל', tr: 'Ацор! Мсилат барзель!', ru: 'Стой! Железная дорога!' },
  school: { he: 'בית ספר', tr: 'Бейт сефер', ru: 'Школа' },
  wc: { he: 'שירותים', tr: 'Шерутим', ru: 'Туалет' },
  music: { he: 'חדר מוזיקה', tr: 'Хадар музика', ru: 'Музыкальный класс' },
  beni: { he: 'בני היה כאן', tr: 'Бени хая кан', ru: 'Здесь был Бени' },
  base: { he: 'שטח צבאי סגור — הכניסה אסורה', tr: 'Шетах цваи сагур — ха-книса асура', ru: 'Закрытая военная зона — вход воспрещён' },
  fire: { he: 'אסור להבעיר אש', tr: 'Асур леhavъир эш', ru: 'Разводить огонь запрещено' },
  fish: { he: 'אסור לדוג', tr: 'Асур ладуг', ru: 'Рыбачить запрещено (никто не слушается)' },
  emily: { he: '!החדר של אמילי — אסור להיכנס', tr: 'Ха-хедер шель Эмили — асур леhиканес!', ru: 'Комната Эмили — вход запрещён!' },
  garage: { he: 'מוסך של אבא', tr: 'Мусах шель аба', ru: 'Папин гараж' },
  principal: { he: 'מנהל', tr: 'Менахель', ru: 'Директор' },
};

function exitsOnEdge(m: GameMap, side: 'n' | 's' | 'e' | 'w', from: number, to: number, target: string, label: string) {
  for (let i = from; i <= to; i++) {
    const [x, y] = side === 'n' ? [i, 0] : side === 's' ? [i, m.h - 1] : side === 'e' ? [m.w - 1, i] : [0, i];
    setTile(m, x, y, 'exit');
    m.exits.push({ x, y, to: target, label });
    // проход к выходу
    const [ix, iy] = side === 'n' ? [x, 1] : side === 's' ? [x, m.h - 2] : side === 'e' ? [m.w - 2, y] : [1, y];
    if (!TILES[getTile(m, ix, iy)].walk) setTile(m, ix, iy, 'dirt');
  }
}

/** Нора: клетка входа + точка взгляда в 2–3 клетках против направления. */
function placeBurrow(m: GameMap, rng: Rng, id: string, name: string, target: string, key: string, area: [number, number, number, number], water = false): Secret | null {
  for (let t = 0; t < 400; t++) {
    const x = rng.int(area[0], area[0] + area[2] - 1), y = rng.int(area[1], area[1] + area[3] - 1);
    const tile = getTile(m, x, y);
    if (water) {
      if (tile !== 'water' && tile !== 'deep') continue;
      const s: Secret = { id, kind: 'burrow', name, x, y, target, key, water: true, revealed: false };
      m.secrets.push(s);
      return s;
    }
    if (!['grass', 'dirt', 'sand', 'floor', 'wood', 'hill', 'asphalt'].includes(tile)) continue;
    if (m.props.some((p) => p.x === x && p.y === y) || m.exits.some((e) => e.x === x && e.y === y)) continue;
    const dir = rng.int(0, 7);
    const k = rng.int(2, 3);
    const vx = x - DIRS8[dir][0] * k, vy = y - DIRS8[dir][1] * k;
    const vt = getTile(m, vx, vy);
    if (!TILES[vt].walk || TILES[vt].water || vt === 'exit') continue;
    const s: Secret = { id, kind: 'burrow', name, x, y, target, key, viewX: vx, viewY: vy, dir, revealed: false };
    m.secrets.push(s);
    return s;
  }
  return null;
}

function strangeCat(m: GameMap, rng: Rng, n: number, area?: [number, number, number, number]) {
  const kinds = [
    { name: 'Синий кот Гавчик', color: '#4080ff', sound: 'bark' },
    { name: 'Зелёный кот Квакер', color: '#40e060', sound: 'quack' },
    { name: 'Фиолетовый кот Барбос', color: '#b060ff', sound: 'bark' },
    { name: 'Розовый кот Лягушонок', color: '#ff70c0', sound: 'quack' },
  ];
  const k = kinds[n];
  const p = findFree(m, rng, ['grass', 'dirt', 'sand', 'floor', 'asphalt'], area);
  const c = makeActor('cat_strange', p.x, p.y, { name: k.name, color: k.color });
  c.data.sound = k.sound;
  c.data.home = { x: p.x, y: p.y };
  c.data.strangeId = 'L1_' + n;
  m.actors.push(c);
}

function gingerCat(m: GameMap, x: number, y: number, name: string, catId: string, extra: Record<string, any> = {}) {
  const c = makeActor('cat_orange', x, y, { name });
  c.data.catId = catId;
  c.data.home = { x, y };
  Object.assign(c.data, extra);
  m.actors.push(c);
  return c;
}

function npc(m: GameMap, kind: string, x: number, y: number, home = true) {
  const a = makeActor(kind, x, y);
  if (home) a.data.home = { x, y };
  m.actors.push(a);
  return a;
}

function items(m: GameMap, rng: Rng, item: string, n: number, on: TileId[], area?: [number, number, number, number]) {
  for (let i = 0; i < n; i++) {
    const p = findFree(m, rng, on, area, (x, y) => m.items.some((it) => it.x === x && it.y === y));
    m.items.push({ x: p.x, y: p.y, item, qty: 1 });
  }
}

// ─────────────────────────────────────────── Зона 1: Дом и двор
export function buildYard(g: Game, rng: Rng): GameMap {
  const m = newMap('yard', 'Дом и двор', 70, 44, 'grass');
  m.he = 'הבית והחצר';
  m.ambience = 'amb_level1';
  border(m, 'fence');
  // улицы
  fillRect(m, 1, 21, 62, 2, 'asphalt');
  fillRect(m, 40, 1, 2, 21, 'asphalt');
  // зелень
  scatter(m, rng, 'euc', 40, ['grass']);
  scatter(m, rng, 'orange', 18, ['grass'], [1, 24, 40, 18]);
  scatter(m, rng, 'flower', 40, ['grass']);
  scatter(m, rng, 'bush', 25, ['grass']);
  // дом Бени
  room(m, 4, 4, 18, 12, 'floor');
  for (let y = 4; y < 16; y++) setTile(m, 12, y, 'wall');
  for (let x = 12; x < 22; x++) setTile(m, x, 10, 'wall');
  fillRect(m, 13, 5, 8, 5, 'wood');
  fillRect(m, 13, 11, 8, 4, 'wood');
  setTile(m, 12, 7, 'door');
  setTile(m, 12, 13, 'door');
  setTile(m, 8, 15, 'door');
  setTile(m, 9, 15, 'door');
  setTile(m, 6, 4, 'window');
  setTile(m, 15, 15, 'window');
  setTile(m, 14, 4, 'poster');
  setTile(m, 17, 4, 'poster');
  setTile(m, 5, 5, 'stove');
  setTile(m, 8, 8, 'table');
  setTile(m, 9, 8, 'table');
  setTile(m, 19, 5, 'table');
  setTile(m, 14, 8, 'bed');
  setTile(m, 19, 13, 'bed');
  m.props.push({ x: 5, y: 5, id: 'stove', name: 'мамина плита (помыть посуду)' });
  m.props.push({ x: 8, y: 8, id: 'table', name: 'стол (нарисовать открытку)' });
  m.props.push({ x: 9, y: 8, id: 'dinner', name: 'обеденный стол' });
  m.props.push({ x: 19, y: 5, id: 'guitar_wall', name: 'гитара без струн на стене' });
  m.props.push({ x: 14, y: 8, id: 'bed', name: 'кровать Бени' });
  m.signs.push({ x: 11, y: 13, ...HEB.emily, lang: 'he' });
  setTile(m, 11, 13, 'sign');
  m.items.push({ x: 7, y: 12, item: 'flashlight', qty: 1 });
  m.items.push({ x: 10, y: 6, item: 'cutlet', qty: 1 });
  m.items.push({ x: 10, y: 13, item: 'blanket', qty: 1 });
  m.flags.emilyRoom = [13, 11, 8, 4];
  // гараж папы
  room(m, 24, 6, 9, 8, 'floor');
  setTile(m, 28, 13, 'door');
  setTile(m, 27, 9, 'car');
  setTile(m, 28, 9, 'car');
  setTile(m, 30, 11, 'table');
  m.props.push({ x: 27, y: 9, id: 'car', name: 'папина машина (заглянуть под машину)' });
  m.props.push({ x: 30, y: 11, id: 'bike', name: 'сломанный велосипед' });
  m.items.push({ x: 25, y: 12, item: 'rope', qty: 1 });
  m.signs.push({ x: 29, y: 14, ...HEB.garage, lang: 'he' });
  setTile(m, 29, 14, 'sign');
  // крыша гаража и матрас
  fillRect(m, 24, 5, 9, 1, 'roof');
  setTile(m, 23, 5, 'dirt');
  setTile(m, 23, 4, 'dirt');
  setTile(m, 33, 5, 'grass');
  setTile(m, 34, 5, 'mattress');
  setTile(m, 35, 5, 'grass');
  m.props.push({ x: 34, y: 5, id: 'mattress', name: 'старый матрас' });
  m.flags.roofTiles = true;
  // соседский дом и осиное гнездо
  room(m, 46, 6, 12, 9, 'floor');
  setTile(m, 51, 14, 'door');
  setTile(m, 49, 14, 'window');
  setTile(m, 54, 14, 'window');
  setTile(m, 56, 15, 'euc');
  m.props.push({ x: 56, y: 15, id: 'nest', name: 'осиное гнездо на эвкалипте' });
  m.props.push({ x: 49, y: 14, id: 'nwindow', name: 'окно ворчливого соседа' });
  setTile(m, 50, 16, 'grass');
  // кафе
  room(m, 48, 25, 11, 7, 'tile');
  setTile(m, 52, 25, 'door');
  setTile(m, 51, 24, 'sign');
  m.signs.push({ x: 51, y: 24, ...HEB.cafe, lang: 'he' });
  setTile(m, 50, 28, 'table');
  setTile(m, 54, 28, 'table');
  m.items.push({ x: 56, y: 29, item: 'pita', qty: 1 });
  // мусорные баки
  setTile(m, 44, 25, 'bin');
  setTile(m, 45, 25, 'bin');
  m.items.push({ x: 44, y: 26, item: 'cardboard', qty: 1 });
  // двор с собакой
  for (let x = 10; x < 20; x++) {
    setTile(m, x, 32, 'fence');
    setTile(m, x, 38, 'fence');
  }
  for (let y = 32; y <= 38; y++) {
    setTile(m, 10, y, 'fence');
    setTile(m, 20, y, 'fence');
  }
  fillRect(m, 11, 33, 9, 5, 'dirt');
  setTile(m, 15, 32, 'dirt');
  setTile(m, 9, 31, 'sign');
  m.signs.push({ x: 9, y: 31, ...HEB.dog, lang: 'he' });
  // вывеска поселения
  setTile(m, 30, 24, 'sign');
  m.signs.push({ x: 30, y: 24, ...HEB.town, lang: 'he', note: 'Если долго постоять перед вывеской, может случиться что-то странное…' });
  m.flags.townSign = { x: 30, y: 24 };
  // железная дорога
  for (let y = 1; y < m.h - 1; y++) {
    setTile(m, 63, y, 'rail');
    setTile(m, 64, y, 'rail');
  }
  fillRect(m, 65, 1, 4, m.h - 2, 'grass');
  scatter(m, rng, 'euc', 8, ['grass'], [65, 1, 4, 42]);
  setTile(m, 61, 19, 'sign');
  m.signs.push({ x: 61, y: 19, ...HEB.rail, lang: 'he' });
  m.flags.railX = [63, 64];
  m.props.push({ x: 63, y: 21, id: 'crossing', name: 'переезд' });
  exitsOnEdge(m, 'e', 20, 22, 'forest', 'Лес за железной дорогой');
  exitsOnEdge(m, 'n', 40, 41, 'school', 'Школа');
  // старт
  m.start = { x: 8, y: 17 };
  fillRect(m, 6, 16, 6, 3, 'dirt');

  // семья и друзья
  npc(m, 'nina', 6, 6);
  npc(m, 'vova', 26, 8);
  npc(m, 'emily', 16, 12);
  npc(m, 'ido', 14, 18);
  npc(m, 'yakut', 22, 4);
  npc(m, 'amir', 50, 17);
  npc(m, 'yonatan', 36, 23);
  npc(m, 'iit', 30, 26);
  npc(m, 'neighbor', 51, 12);
  const dog = makeActor('dog', 15, 35);
  dog.data.home = { x: 15, y: 35 };
  m.actors.push(dog);
  const dog2 = makeActor('dog', 60, 36);
  dog2.data.home = { x: 60, y: 36 };
  m.actors.push(dog2);
  // коты
  gingerCat(m, 46, 26, 'Апельсин', 'apelsin');
  gingerCat(m, 55, 29, 'Шекель', 'shekel');
  gingerCat(m, 10, 18, 'Хумус', 'hummus', { lazy: true });
  for (let i = 0; i < 3; i++) {
    const p = findFree(m, rng, ['grass', 'asphalt']);
    const c = makeActor('cat', p.x, p.y, { color: rng.pick(['#d0d0d0', '#606060', '#f0f0f0', '#a08070']) });
    c.data.home = p;
    m.actors.push(c);
  }
  strangeCat(m, rng, 0, [30, 25, 30, 16]);
  // враги-мелочь
  for (let i = 0; i < 2; i++) {
    const p = findFree(m, rng, ['grass'], [30, 26, 30, 15]);
    m.actors.push(makeActor('crow', p.x, p.y));
  }
  // предметы
  items(m, rng, 'rock', 7, ['grass', 'dirt']);
  items(m, rng, 'bamba', 2, ['grass']);
  items(m, rng, 'wrench', 1, ['grass'], [30, 26, 30, 15]);
  items(m, rng, 'skate', 1, ['asphalt']);
  items(m, rng, 'watermelon', 1, ['grass']);
  // секреты: водосточная труба и нора в Мир Рыжих Котов
  const pp = findFree(m, rng, ['grass'], [2, 26, 26, 16]);
  setTile(m, pp.x, pp.y, 'pipe');
  m.secrets.push({ id: 'L1_pipe_yard', kind: 'pipe', name: 'Водосточная труба во дворе', x: pp.x, y: pp.y, target: 'sec_yardpipe', revealed: true });
  const b = placeBurrow(m, rng, 'L1_burrow_cats', 'Мир Рыжих Котов', 'dim_cats', 'key_cats', [36, 23, 24, 8]);
  if (b) {
    // подсказка: кот смотрит в пустоту в сторону норы
    const c = makeActor('cat', b.viewX!, b.viewY!, { name: 'Задумчивый кот', color: '#c0c0c0' });
    c.data.lookDir = b.dir;
    c.data.home = { x: b.viewX!, y: b.viewY! };
    const fp = g.freeNear(b.viewX!, b.viewY!, m);
    if (fp) {
      c.x = fp.x;
      c.y = fp.y;
    }
    m.actors.push(c);
  }
  // секрет после трёх прыжков: невидимая дверь в воздухе над матрасом
  m.secrets.push({ id: 'L1_air_roof', kind: 'air', name: 'Дверь в небе над гаражом', x: 36, y: 5, target: 'sec_air', revealed: false });
  setTile(m, 36, 5, 'grass');
  setTile(m, 37, 5, 'grass');

  ensureReachable(m, [...m.actors, ...m.exits, ...m.items, ...m.secrets.filter((s) => s.kind !== 'air')]);
  return m;
}

// ─────────────────────────────────────────── Зона 2: Лес за железной дорогой
export function buildForest(g: Game, rng: Rng): GameMap {
  const W = 72, H = 46;
  const m = newMap('forest', 'Лес за железной дорогой', W, H, 'grass');
  m.he = 'היער מעבר למסילה';
  m.ambience = 'amb_level1';
  const ca = cellular(W, H, rng, 0.46, 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ca[y * W + x]) setTile(m, x, y, rng.chance(0.55) ? 'euc' : 'pine');
  scatter(m, rng, 'bush', 120, ['grass']);
  scatter(m, rng, 'flower', 30, ['grass']);
  // главная тропа: запад → центр → юг и восток
  const path = (x1: number, y1: number, x2: number, y2: number) => {
    let x = x1, y = y1;
    while (x !== x2 || y !== y2) {
      for (let dy = 0; dy < 2; dy++) if (!['water', 'deep'].includes(getTile(m, x, y + dy))) setTile(m, x, y + dy, 'dirt');
      if (x !== x2 && (rng.chance(0.7) || y === y2)) x += Math.sign(x2 - x);
      else y += Math.sign(y2 - y);
    }
  };
  path(1, 22, 36, 22);
  path(36, 22, 36, H - 2);
  path(36, 22, W - 2, 18);
  border(m, 'pine');
  exitsOnEdge(m, 'w', 21, 23, 'yard', 'Дом и двор');
  exitsOnEdge(m, 's', 35, 37, 'river', 'Речка');
  exitsOnEdge(m, 'e', 17, 19, 'base', 'Военная база');
  m.start = { x: 2, y: 22 };
  // поляны
  const clear = (cx: number, cy: number, r: number) => {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r && x > 0 && y > 0 && x < W - 1 && y < H - 1) setTile(m, x, y, 'grass');
  };
  // шалаш старших ребят
  const ex = rng.int(50, 62), ey = rng.int(30, 40);
  clear(ex, ey, 4);
  path(ex, ey, 36, ey);
  setTile(m, ex, ey, 'shalash');
  m.props.push({ x: ex, y: ey, id: 'elder_shalash', name: 'шалаш старших ребят' });
  m.items.push({ x: ex + 1, y: ey + 1, item: 'cassette_album', qty: 1 });
  m.actors.push(makeActor('elder', ex - 2, ey));
  m.actors.push(makeActor('elder', ex + 2, ey - 1));
  // площадка Великого Шалаша
  const gx = rng.int(12, 24), gy = rng.int(8, 14);
  clear(gx, gy, 4);
  path(gx, gy, gx, 22);
  setTile(m, gx, gy, 'site');
  m.props.push({ x: gx, y: gy, id: 'great_site', name: 'большая поляна (место для Великого Шалаша)' });
  m.flags.greatSite = { x: gx, y: gy };
  // обычные места для шалашей
  for (let i = 0; i < 3; i++) {
    const p = findFree(m, rng, ['grass'], [4, 26, 30, 16]);
    clear(p.x, p.y, 2);
    setTile(m, p.x, p.y, 'site');
    m.props.push({ x: p.x, y: p.y, id: 'site', name: 'поляна для шалаша' });
  }
  // прудик для отражения
  const px = rng.int(46, 60), py = rng.int(6, 12);
  clear(px, py, 3);
  for (let y = py - 1; y <= py + 1; y++) for (let x = px - 2; x <= px + 2; x++) setTile(m, x, y, 'water');
  path(px, py + 2, px, 19);
  placeBurrow(m, rng, 'L1_burrow_rogue', 'Перевёрнутый мир', 'dim_rogue', 'key_rogue', [px - 2, py - 1, 5, 3], true);
  // Энбар, Гая
  const en = findFree(m, rng, ['grass'], [20, 28, 14, 14]);
  clear(en.x, en.y, 2);
  npc(m, 'enbar', en.x, en.y);
  const ga = findFree(m, rng, ['grass', 'dirt'], [40, 14, 20, 10]);
  npc(m, 'gaya', ga.x, ga.y);
  npc(m, 'mila', gx + 2, gy + 1);
  // нора в Мамонтову мерзлоту
  placeBurrow(m, rng, 'L1_burrow_frost', 'Мамонтова мерзлота', 'dim_frost', 'key_frost', [4, 4, 30, 14]);
  // яма — провал в пещеру
  const hp = findFree(m, rng, ['grass'], [40, 24, 28, 18]);
  setTile(m, hp.x, hp.y, 'hole');
  m.secrets.push({ id: 'L1_hole_forest', kind: 'hole', name: 'Провал в старую пещеру', x: hp.x, y: hp.y, target: 'sec_cave', revealed: true });
  // Феникс приходит только ночью
  const fp = findFree(m, rng, ['grass'], [4, 30, 30, 12]);
  gingerCat(m, fp.x, fp.y, 'Феникс', 'phoenix', { nightOnly: true });
  strangeCat(m, rng, 1, [40, 2, 28, 14]);
  // враги
  for (let i = 0; i < 3; i++) {
    const p = findFree(m, rng, ['grass', 'dirt'], [10, 26, 56, 18]);
    m.actors.push(makeActor('scorpion', p.x, p.y));
  }
  for (let i = 0; i < 2; i++) {
    const p = findFree(m, rng, ['grass']);
    m.actors.push(makeActor('crow', p.x, p.y));
  }
  setTile(m, 6, 20, 'sign');
  m.signs.push({ x: 6, y: 20, ...HEB.fire, lang: 'he' });
  items(m, rng, 'branches', 6, ['grass', 'dirt']);
  items(m, rng, 'stick', 1, ['dirt'], [2, 20, 20, 4]);
  items(m, rng, 'rock', 5, ['grass', 'dirt']);
  items(m, rng, 'bamba', 1, ['grass']);
  items(m, rng, 'watermelon', 1, ['grass']);
  ensureReachable(m, [...m.actors, ...m.exits, ...m.items, ...m.props, ...m.secrets.filter((s) => !s.water).map((s) => ({ x: s.viewX ?? s.x, y: s.viewY ?? s.y })), { x: px, y: py + 2 }]);
  return m;
}

// ─────────────────────────────────────────── Зона 3: Речка и Сомик
export function buildRiver(g: Game, rng: Rng): GameMap {
  const W = 70, H = 44;
  const m = newMap('river', 'Речка и Сомик', W, H, 'grass');
  m.he = 'הנחל';
  m.ambience = 'amb_level1';
  scatter(m, rng, 'euc', 60, ['grass']);
  scatter(m, rng, 'bush', 60, ['grass']);
  // извилистое русло
  let cy = 24;
  const deepAt: { x: number; y: number }[] = [];
  for (let x = 1; x < W - 1; x++) {
    cy += rng.int(-1, 1);
    cy = Math.max(18, Math.min(30, cy));
    for (let y = cy - 5; y <= cy + 5; y++) {
      const d = Math.abs(y - cy);
      const t: TileId = d <= 1 ? 'deep' : d <= 3 ? 'water' : d === 4 ? (rng.chance(0.5) ? 'reeds' : 'sand') : 'sand';
      setTile(m, x, y, t);
      if (t === 'deep') deepAt.push({ x, y });
    }
  }
  // брод
  const fordX = rng.int(20, 50);
  for (let y = 10; y < 40; y++) if (getTile(m, fordX, y) === 'deep') setTile(m, fordX, y, 'water');
  border(m, 'euc');
  // тропа от выхода
  for (let y = 1; y < 14; y++) setTile(m, 35, y, 'dirt');
  exitsOnEdge(m, 'n', 34, 36, 'forest', 'Лес');
  m.start = { x: 35, y: 2 };
  // Сомик
  const sp = deepAt[Math.floor(deepAt.length * (0.3 + rng.next() * 0.4))];
  const som = makeActor('som', sp.x, sp.y);
  som.data.home = { x: sp.x, y: sp.y };
  m.actors.push(som);
  m.flags.somHome = { x: sp.x, y: sp.y };
  // место рыбалки на берегу
  let fy = sp.y;
  while (fy > 1 && getTile(m, sp.x, fy) !== 'sand') fy--;
  setTile(m, sp.x, fy, 'sand');
  m.props.push({ x: sp.x, y: fy, id: 'fishing', name: 'место для рыбалки' });
  for (let y = 1; y < fy; y++) if (!TILES[getTile(m, sp.x, y)].walk) setTile(m, sp.x, y, 'dirt');
  // место для ныряния рядом с Сомиком
  const dv = deepAt.find((d) => Math.abs(d.x - sp.x) === 2 && Math.abs(d.y - sp.y) <= 1) ?? sp;
  m.props.push({ x: dv.x, y: dv.y, id: 'dive', name: 'тёмная глубина у Сомика (нырнуть)' });
  // водосток под железной дорогой (запад)
  const pipeY = cy;
  setTile(m, 2, 12, 'pipe');
  setTile(m, 2, 11, 'sand');
  m.secrets.push({ id: 'L1_pipe_drain', kind: 'pipe', name: 'Дренаж под железной дорогой', x: 2, y: 12, target: 'sec_drain', revealed: true });
  void pipeY;
  // нора-отражение в Подводное царство
  placeBurrow(m, rng, 'L1_burrow_som', 'Подводное царство Сомика', 'dim_som', 'key_som', [5, 10, 60, 25], true);
  setTile(m, 33, 8, 'sign');
  m.signs.push({ x: 33, y: 8, ...HEB.fish, lang: 'he' });
  strangeCat(m, rng, 2, [2, 2, 66, 8]);
  for (let i = 0; i < 8; i++) {
    const p = findFree(m, rng, ['reeds', 'sand']);
    m.actors.push(makeActor('mosquito', p.x, p.y));
  }
  items(m, rng, 'pebble', 1, ['sand']);
  items(m, rng, 'rock', 4, ['sand', 'grass']);
  items(m, rng, 'branches', 2, ['grass']);
  ensureReachable(m, [...m.exits, ...m.items, ...m.props.filter((p) => p.id !== 'dive'), ...m.secrets.filter((s) => !s.water), ...m.actors.filter((a) => a.ai !== 'som')]);
  return m;
}

// ─────────────────────────────────────────── Зона 4: Военная база
export function buildBase(g: Game, rng: Rng): GameMap {
  const W = 70, H = 44;
  const m = newMap('base', 'Военная база (окраина)', W, H, 'sand');
  m.he = 'הבסיס';
  m.ambience = 'amb_level1';
  scatter(m, rng, 'grass', 300, ['sand']);
  scatter(m, rng, 'bush', 40, ['sand', 'grass'], [1, 1, 18, 42]);
  border(m, 'wire');
  // забор базы
  for (let x = 20; x <= 66; x++) {
    setTile(m, x, 6, 'wire');
    setTile(m, x, 40, 'wire');
  }
  for (let y = 6; y <= 40; y++) {
    setTile(m, 20, y, 'wire');
    setTile(m, 66, y, 'wire');
  }
  fillRect(m, 21, 7, 45, 33, 'asphalt');
  // дыра в заборе
  const gapY = rng.int(12, 34);
  setTile(m, 20, gapY, 'dirt');
  m.flags.gap = { x: 19, y: gapY };
  for (const [tx, ty] of [[21, 7], [65, 7], [21, 39], [65, 39]]) setTile(m, tx, ty, 'tower');
  // ангары
  const hangars: [number, number][] = [[26, 10], [44, 10], [26, 26], [44, 26]];
  for (const [hx, hy] of hangars) {
    room(m, hx, hy, 14, 10, 'floor', 'wall');
    setTile(m, hx + 7, hy + 9, 'door');
    setTile(m, hx + 6, hy + 9, 'door');
  }
  const hz = rng.pick(hangars);
  m.items.push({ x: hz[0] + 3, y: hz[1] + 3, item: 'patch', qty: 1 });
  m.items.push({ x: hz[0] + 10, y: hz[1] + 2, item: 'cap', qty: 1 });
  // взлётная полоса видна с холма
  fillRect(m, 3, 4, 8, 5, 'hill');
  m.props.push({ x: 7, y: 6, id: 'hill', name: 'холм (подождать взлёта)' });
  m.flags.hill = { x: 7, y: 6 };
  setTile(m, 18, gapY - 2, 'sign');
  m.signs.push({ x: 18, y: gapY - 2, ...HEB.base, lang: 'he' });
  exitsOnEdge(m, 'w', 20, 22, 'forest', 'Лес');
  m.start = { x: 2, y: 21 };
  // патрули
  const routes = [
    [{ x: 23, y: 9 }, { x: 63, y: 9 }, { x: 63, y: 23 }, { x: 23, y: 23 }],
    [{ x: 23, y: 37 }, { x: 63, y: 37 }, { x: 63, y: 24 }, { x: 23, y: 24 }],
    [{ x: 42, y: 8 }, { x: 42, y: 38 }],
  ];
  for (const r of routes) {
    const s = makeActor('soldier', r[0].x, r[0].y);
    s.data.route = r;
    m.actors.push(s);
  }
  // труба на базе — бункер
  const bx = rng.int(24, 62), by = rng.pick([24, 25]);
  setTile(m, bx, by, 'pipe');
  m.secrets.push({ id: 'L1_pipe_base', kind: 'pipe', name: 'Труба на базе — заброшенный бункер', x: bx, y: by, target: 'sec_bunker', revealed: true });
  // нора в небо: смотреть с холма на север
  m.secrets.push({ id: 'L1_burrow_sky', kind: 'burrow', name: 'Небо реактивных самолётов', x: 7, y: 2, target: 'dim_sky', key: 'key_sky', viewX: 7, viewY: 5, dir: 0, revealed: false });
  setTile(m, 7, 2, 'hill');
  setTile(m, 7, 3, 'hill');
  items(m, rng, 'rock', 4, ['sand', 'grass'], [1, 1, 18, 42]);
  items(m, rng, 'bamba', 1, ['sand'], [1, 1, 18, 42]);
  ensureReachable(m, [...m.exits, ...m.items, ...m.props, { x: bx, y: by }, { x: 7, y: 2 }]);
  return m;
}

// ─────────────────────────────────────────── Зона 5: Школа
export function buildSchool(g: Game, rng: Rng): GameMap {
  const W = 64, H = 46;
  const m = newMap('school', 'Школа', W, H, 'asphalt');
  m.he = 'בית הספר';
  m.ambience = 'amb_level2';
  border(m, 'fence');
  room(m, 4, 4, 56, 34, 'tile', 'wall');
  // коридоры
  fillRect(m, 5, 20, 54, 2, 'tile');
  fillRect(m, 31, 5, 2, 32, 'tile');
  // классы: верхний ряд (y 4..19) и нижний ряд (y 21..37), между ними коридор y=20
  const rooms: { x: number; y: number; w: number; h: number; top: boolean }[] = [];
  for (const top of [true, false]) {
    const y0 = top ? 4 : 21;
    const h = top ? 16 : 17;
    for (const [x0, x1] of [[4, 17], [17, 30], [33, 46], [46, 59]] as [number, number][]) {
      const ww = x1 - x0 + 1;
      for (let x = x0; x <= x1; x++) {
        setTile(m, x, y0, 'wall');
        setTile(m, x, y0 + h - 1, 'wall');
      }
      for (let y = y0; y < y0 + h; y++) {
        setTile(m, x0, y, 'wall');
        setTile(m, x1, y, 'wall');
      }
      fillRect(m, x0 + 1, y0 + 1, ww - 2, h - 2, 'wood');
      rooms.push({ x: x0, y: y0, w: ww, h, top });
    }
  }
  fillRect(m, 5, 20, 54, 1, 'tile');
  // центральный проход от входа к коридору
  fillRect(m, 31, 4, 2, 34, 'tile');
  for (let y = 4; y <= 37; y++) {
    if (y === 20) continue;
    setTile(m, 30, y, 'wall');
    setTile(m, 33, y, 'wall');
  }
  fillRect(m, 31, 4, 2, 1, 'wall');
  const wallRow = (r: { y: number; h: number; top: boolean }) => (r.top ? r.y + r.h - 1 : r.y);
  for (const r of rooms) {
    const dx = r.x + Math.floor(r.w / 2);
    setTile(m, dx, wallRow(r), 'door');
    for (let y = r.y + 4; y < r.y + r.h - 4; y += 3) for (let x = r.x + 3; x < r.x + r.w - 3; x += 3) setTile(m, x, y, 'desk');
    setTile(m, r.x + Math.floor(r.w / 2) - 1, r.top ? r.y : r.y + r.h - 1, 'chalk');
  }
  // роли комнат
  const order = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
  const musicR = rooms[order[0]];
  const wcR = rooms[order[1]];
  const prinR = rooms[order[2]];
  // музыкальный класс
  fillRect(m, musicR.x + 1, musicR.y + 1, musicR.w - 2, musicR.h - 2, 'wood');
  setTile(m, musicR.x + 2, musicR.y + 3, 'piano');
  setTile(m, musicR.x + 3, musicR.y + 3, 'piano');
  m.props.push({ x: musicR.x + 2, y: musicR.y + 3, id: 'piano', name: 'школьное пианино' });
  setTile(m, musicR.x + 1, musicR.y + 6, 'poster');
  npc(m, 'teacher', musicR.x + 5, musicR.y + 4);
  m.flags.musicRoom = [musicR.x, musicR.y, musicR.w, musicR.h];
  placeBurrow(m, rng, 'L1_burrow_rock', 'Рок-измерение', 'dim_rock', 'key_rock', [musicR.x + 1, musicR.y + 1, musicR.w - 2, musicR.h - 2]);
  const ds = wallRow(musicR);
  setTile(m, musicR.x + Math.floor(musicR.w / 2) + 1, ds, 'sign');
  m.signs.push({ x: musicR.x + Math.floor(musicR.w / 2) + 1, y: ds, ...HEB.music, lang: 'he' });
  // туалет — арена мини-босса
  fillRect(m, wcR.x + 1, wcR.y + 1, wcR.w - 2, wcR.h - 2, 'tile');
  for (let i = 0; i < 4; i++) setTile(m, wcR.x + 2 + i * 3, wcR.top ? wcR.y + 2 : wcR.y + wcR.h - 3, 'stall');
  for (let i = 0; i < 3; i++) setTile(m, wcR.x + wcR.w - 2, wcR.y + 4 + i * 3, 'sink');
  scatter(m, rng, 'wet', 25, ['tile'], [wcR.x + 1, wcR.y + 1, wcR.w - 2, wcR.h - 2]);
  for (let i = 0; i < 4; i++) m.props.push({ x: wcR.x + 2 + i * 3, y: wcR.top ? wcR.y + 2 : wcR.y + wcR.h - 3, id: 'stall', name: 'дверь кабинки' });
  m.flags.wcRoom = [wcR.x, wcR.y, wcR.w, wcR.h];
  const wsx = wcR.x + Math.floor(wcR.w / 2) + 1, wsy = wallRow(wcR);
  setTile(m, wsx, wsy, 'sign');
  m.signs.push({ x: wsx, y: wsy, ...HEB.wc, lang: 'he' });
  // кабинет директора
  setTile(m, prinR.x + 4, prinR.y + 4, 'table');
  m.flags.principal = { x: prinR.x + 4, y: prinR.y + 5 };
  const psx = prinR.x + Math.floor(prinR.w / 2) + 1, psy = wallRow(prinR);
  setTile(m, psx, psy, 'sign');
  m.signs.push({ x: psx, y: psy, ...HEB.principal, lang: 'he' });
  // шкафчики в коридоре
  for (let x = 6; x < 30; x += 2) if (getTile(m, x, 19) === 'wall') setTile(m, x, 19, 'locker');
  // ложная стена «Здесь был Бени»
  const fx = rng.pick([36, 43, 50, 56]);
  setTile(m, fx, 21, 'fwall');
  m.secrets.push({ id: 'L1_false_school', kind: 'false', name: 'Ложная стена в школе', x: fx, y: 21, target: 'sec_beni', revealed: false });
  // двор школы и крыша (Капитан)
  fillRect(m, 1, 38, 62, 7, 'asphalt');
  fillRect(m, 52, 39, 8, 3, 'roof');
  gingerCat(m, 56, 40, 'Капитан', 'captain');
  setTile(m, 31, 37, 'door');
  setTile(m, 32, 37, 'door');
  setTile(m, 31, 4, 'wall');
  setTile(m, 32, 4, 'wall');
  setTile(m, 29, 40, 'sign');
  m.signs.push({ x: 29, y: 40, ...HEB.school, lang: 'he' });
  exitsOnEdge(m, 's', 31, 32, 'yard', 'Дом и двор');
  m.start = { x: 31, y: 43 };
  strangeCat(m, rng, 3, [2, 39, 45, 5]);
  // охрана
  const guard = makeActor('guard', 31, 20);
  guard.data.route = [{ x: 6, y: 20 }, { x: 57, y: 20 }];
  m.actors.push(guard);
  npc(m, 'iit', 20, 41);
  items(m, rng, 'bamba', 2, ['wood']);
  items(m, rng, 'cassette', 1, ['wood']);
  ensureReachable(m, [...m.exits, ...m.items, ...m.props, ...m.actors, ...m.secrets.map((s) => ({ x: s.viewX ?? s.x, y: s.viewY ?? s.y }))], 'tile');
  return m;
}

// ─────────────────────────────────────────── Арена босса: ночная железная дорога
export function buildBossArena(): GameMap {
  const m = newMap('boss', 'Ночная железная дорога', 46, 22, 'dirt');
  m.he = 'המסילה בלילה';
  m.music = 'boss_train';
  m.light = 'dim';
  border(m, 'pine');
  for (const ly of [5, 10, 15]) for (let x = 1; x < 45; x++) {
    setTile(m, x, ly, 'rail');
  }
  scatter(m, new Rng(7), 'bush', 30, ['dirt']);
  for (let x = 2; x < 44; x += 6) setTile(m, x, 1, 'hill');
  m.start = { x: 22, y: 19 };
  m.flags.lanes = [5, 10, 15];
  return m;
}
