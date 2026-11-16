// Ядро игры: состояние забега, пошаговый цикл, бой, обзор, секреты, аккорды.
import { FOV } from 'rot-js';
import { Rng } from './rng';
import { TILES, type TileId } from './tiles';
import {
  type Actor, type GameMap, type MapItem, type Prop, type Secret, type Sign, DIRS8, DIR_NAMES,
  getTile, setTile, inBounds, idx,
} from './types';
import { makeActor, resetIds } from '../entities/actors';
import { ITEMS, itemDef } from '../entities/items';
import { type Album, loadAlbum, saveAlbum } from './save';
import { LEVELS, type LevelModule } from '../levels/registry';
import { PERKS, type PerkId } from '../systems/perks';

export type Mode =
  | 'title' | 'play' | 'dialog' | 'inventory' | 'chords' | 'perk' | 'map' | 'album' | 'dead' | 'victory' | 'help' | 'intro' | 'quests' | 'profiles';

export interface DialogOpt {
  label: string;
  act?: () => void;
}
export interface Dialog {
  who: string;
  color?: string;
  text: string;
  foreign?: { orig: string; tr: string; ru: string; rtl?: boolean };
  options: DialogOpt[];
  voice?: string;
}

export interface Fx {
  kind: 'shake' | 'flash' | 'wave' | 'laser' | 'float' | 'spark' | 'train' | 'jet' | 'lane';
  x?: number;
  y?: number;
  x2?: number;
  y2?: number;
  color?: string;
  text?: string;
  ttl: number;
  max: number;
  r?: number;
}

export interface LogLine {
  text: string;
  color: string;
  turn: number;
}

export interface Hooks {
  sfx(id: string): void;
  music(id: string): void;
  voice(id: string): void;
  ambience(id: string | undefined): void;
}

const noHooks: Hooks = { sfx() {}, music() {}, voice() {}, ambience() {} };

export const DAY_LEN = 400;
export const INV_BASE = 16;

export class Game {
  rng: Rng;
  seed: number;
  maps: Record<string, GameMap> = {};
  mapId = '';
  player!: Actor;
  level = 1;
  levelMod!: LevelModule;
  stats = { str: 3, jump: 2, rock: 0, nagl: 2, love: 50, hunger: 100, drive: 0, maxDrive: 10, xp: 0, lvl: 1, style: 0, dodge: 0 };
  perks = new Set<PerkId>();
  inv = new Map<string, number>();
  weapon: string | null = null;
  worn = new Set<string>();
  flags: Record<string, any> = {};
  turn = 0;
  facing = 4;
  invuln = 0;
  breath = 10;
  log: LogLine[] = [];
  mode: Mode = 'title';
  dialogs: Dialog[] = [];
  perkChoices: PerkId[] = [];
  album: Album;
  ascii = false;
  fx: Fx[] = [];
  hooks: Hooks = noHooks;
  chordSeq: string[] = [];
  secretsFound = new Set<string>();
  achievements = new Set<string>();
  somMemory = 0;
  usedFamily = false;
  skateFree = false;
  dirty = true;
  stillTurns = 0;
  visRadius = 10;
  onChange: () => void = () => {};

  constructor(seed = Date.now() % 1e9, album?: Album) {
    this.seed = seed;
    this.rng = new Rng(seed);
    this.album = album ?? loadAlbum();
  }

  // ───────────────────────── старт и уровни
  newRun(seed = Date.now() % 1e9) {
    this.seed = seed;
    this.rng = new Rng(seed);
    resetIds();
    this.maps = {};
    this.stats = { str: 3, jump: 2, rock: 0, nagl: 2, love: 50, hunger: 100, drive: 0, maxDrive: 10, xp: 0, lvl: 1, style: 0, dodge: 0 };
    this.perks = new Set();
    this.inv = new Map();
    this.weapon = null;
    this.worn = new Set();
    this.flags = {};
    this.turn = 0;
    this.invuln = 0;
    this.log = [];
    this.fx = [];
    this.secretsFound = new Set();
    this.achievements = new Set();
    this.somMemory = 0;
    this.usedFamily = false;
    this.player = makeActor('nina', 0, 0, {
      kind: 'player', name: 'Бени', ch: '@', color: '#ff8a20', hp: 20, maxHp: 20, atk: 0, faction: 'player', ai: 'player', tags: new Set(['player']),
    });
    if (this.album.unlocks.extraHeart) {
      this.player.maxHp += 5;
      this.player.hp += 5;
    }
    this.album.runs++;
    saveAlbum(this.album);
    this.addItem('hose', 1, true);
    this.weapon = 'hose';
    this.addItem('bamba', 2, true);
    this.startLevel(1);
  }

  startLevel(n: number) {
    this.level = n;
    this.levelMod = LEVELS[n - 1];
    const { startMap } = this.levelMod.build(this);
    const m = this.maps[startMap];
    this.enterMap(startMap, m.start.x, m.start.y, true);
    if (n > this.album.bestLevel) {
      this.album.bestLevel = n;
      saveAlbum(this.album);
    }
    this.mode = 'intro';
  }

  get map(): GameMap {
    return this.maps[this.mapId];
  }

  enterMap(id: string, x: number, y: number, first = false) {
    const old = this.mapId ? this.map : null;
    // компаньоны идут следом
    const followers = old ? old.actors.filter((a) => a.faction === 'ally' && !a.dead && a.data.follow && this.dist(a, this.player) <= 4) : [];
    if (old) {
      old.actors = old.actors.filter((a) => a !== this.player && !followers.includes(a));
    }
    const m = this.maps[id];
    if (!m) throw new Error('Нет карты ' + id);
    this.mapId = id;
    this.player.x = x;
    this.player.y = y;
    if (!m.actors.includes(this.player)) m.actors.unshift(this.player);
    for (const f of followers) {
      const p = this.freeNear(x, y) ?? { x, y };
      f.x = p.x;
      f.y = p.y;
      m.actors.push(f);
    }
    this.hooks.music(this.currentMusic());
    this.hooks.ambience(m.ambience);
    if (!first) this.msg(`— ${m.name}${m.he ? ' · ' + m.he : ''} —`, '#ffe9a0');
    if (this.perks.has('vova') && !m.flags.vovaUsed && !m.isDimension) {
      m.flags.vovaUsed = true;
      m.explored.fill(1);
      this.markNearestBurrow(m);
      this.msg('Папин совет: «Сынок, вот тебе карта этих мест». Карта раскрыта.', '#80b0ff');
    }
    this.levelMod.onEnterMap?.(this, m);
    this.computeFov();
  }

  currentMusic(): string {
    const m = this.map;
    if (m.flags.musicOverride) return m.flags.musicOverride;
    if (m.music === 'level1_day' && this.isNight()) return 'level1_night';
    return m.music;
  }

  // ───────────────────────── утилиты
  msg(text: string, color = '#e8e0d0') {
    this.log.push({ text, color, turn: this.turn });
    if (this.log.length > 200) this.log.shift();
    this.dirty = true;
  }
  say(a: Actor, text: string, ttl = 6) {
    a.say = text;
    a.sayTtl = ttl;
  }
  dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }
  actorAt(x: number, y: number, m = this.map): Actor | undefined {
    return m.actors.find((a) => !a.dead && !a.data.hidden && a.x === x && a.y === y);
  }
  isWalkable(x: number, y: number, m = this.map) {
    return inBounds(m, x, y) && TILES[getTile(m, x, y)].walk;
  }
  freeNear(x: number, y: number, m = this.map): { x: number; y: number } | null {
    for (let r = 1; r < 6; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx, ny = y + dy;
          if (this.isWalkable(nx, ny, m) && !this.actorAt(nx, ny, m) && getTile(m, nx, ny) !== 'exit') return { x: nx, y: ny };
        }
    return null;
  }
  spawn(kind: string, x: number, y: number, over: Partial<Actor> = {}, m = this.map): Actor {
    const a = makeActor(kind, x, y, over);
    m.actors.push(a);
    return a;
  }
  isNight() {
    const t = this.turn % DAY_LEN;
    return t >= 290;
  }
  timeOfDay(): 'день' | 'закат' | 'ночь' {
    const t = this.turn % DAY_LEN;
    return t < 250 ? 'день' : t < 290 ? 'закат' : 'ночь';
  }
  hasItem(id: string, n = 1) {
    return (this.inv.get(id) ?? 0) >= n;
  }
  invCount() {
    let c = 0;
    for (const [id] of this.inv) if (ITEMS[id].kind !== 'key') c++;
    return c;
  }
  invLimit() {
    return INV_BASE + (this.flags.friend_ido ? 5 : 0);
  }
  addItem(id: string, qty = 1, silent = false): boolean {
    const d = itemDef(id);
    if (d.kind === 'meta') {
      this.album.memories += qty;
      saveAlbum(this.album);
      if (!silent) this.msg(`+${qty} «Воспоминание» (в Альбоме: ${this.album.memories})`, '#ffe0a0');
      return true;
    }
    if (!this.inv.has(id) && d.kind !== 'key' && this.invCount() >= this.invLimit()) {
      if (!silent) this.msg('Карманы полны! Идо мог бы понести лишнее.', '#ff8080');
      return false;
    }
    this.inv.set(id, (this.inv.get(id) ?? 0) + qty);
    if (!silent) {
      this.msg(`Найдено: ${d.name}${qty > 1 ? ' ×' + qty : ''}`, d.color);
      this.hooks.sfx('pickup');
    }
    if (d.kind === 'wear') this.wear(id);
    this.levelMod?.onPickup?.(this, id);
    return true;
  }
  removeItem(id: string, qty = 1) {
    const n = (this.inv.get(id) ?? 0) - qty;
    if (n > 0) this.inv.set(id, n);
    else {
      this.inv.delete(id);
      if (this.weapon === id) this.weapon = null;
    }
  }
  wear(id: string) {
    if (this.worn.has(id)) return;
    this.worn.add(id);
    if (id === 'cap') this.stats.nagl += 1;
    if (id === 'pick') this.stats.rock += 2;
    if (id === 'jacket') {
      this.stats.style += 10;
      this.player.def += 1;
    }
  }
  dropItemAt(id: string, x: number, y: number, qty = 1, m = this.map) {
    m.items.push({ x, y, item: id, qty });
  }
  addXp(n: number) {
    this.stats.xp += n;
    while (this.stats.xp >= this.xpNext()) {
      this.stats.xp -= this.xpNext();
      this.stats.lvl++;
      this.player.maxHp += 3;
      this.player.hp += 3;
      this.msg(`Новый уровень! Бени теперь ${this.stats.lvl}-го уровня. +3 ❤️`, '#ffff60');
      this.hooks.sfx('level_up');
      this.offerPerks();
    }
  }
  xpNext() {
    return this.stats.lvl * 20;
  }
  offerPerks() {
    const pool = (Object.keys(PERKS) as PerkId[]).filter((p) => PERKS[p].pickable && !this.perks.has(p));
    this.rng.shuffle(pool);
    this.perkChoices = pool.slice(0, 3);
    if (this.perkChoices.length) this.mode = 'perk';
  }
  givePerk(p: PerkId) {
    if (this.perks.has(p)) return;
    this.perks.add(p);
    if (p === 'cat') this.stats.dodge += 10;
    if (p === 'somfriend' || p === 'deep') this.breath = this.maxBreath();
    this.msg(`Перк: «${PERKS[p].name}» — ${PERKS[p].desc}`, '#ffd060');
  }
  maxBreath() {
    return 10 + (this.perks.has('somfriend') ? 5 : 0) + (this.perks.has('deep') ? 10 : 0);
  }
  achieve(id: string, name: string) {
    if (this.achievements.has(id)) return;
    this.achievements.add(id);
    if (!this.album.achievements.includes(name)) this.album.achievements.push(name);
    saveAlbum(this.album);
    this.msg(`★ Достижение: «${name}»`, '#ffd700');
    this.hooks.sfx('secret_found');
  }
  foundSecret(id: string, name: string) {
    if (this.secretsFound.has(id)) return;
    this.secretsFound.add(id);
    if (!this.album.secretsFound.includes(id)) this.album.secretsFound.push(id);
    this.album.memories += 1;
    saveAlbum(this.album);
    this.msg(`✦ Секрет найден: ${name}! (+1 Воспоминание; в Альбоме: ${this.album.secretsFound.length} из ${this.album.totalSecrets})`, '#e080ff');
    this.hooks.sfx('secret_found');
    if (this.secretsFound.size >= 10 && !this.perks.has('eagle')) this.givePerk('eagle');
  }
  pushDialog(d: Dialog) {
    this.dialogs.push(d);
    this.mode = 'dialog';
    if (d.voice) this.hooks.voice(d.voice);
  }
  /** короткое сообщение-окно с одной кнопкой */
  popup(who: string, text: string, color?: string, after?: () => void, voice?: string) {
    this.pushDialog({ who, text, color, voice, options: [{ label: 'Дальше', act: after }] });
  }
  chooseDialog(i: number) {
    const d = this.dialogs[0];
    if (!d) return;
    const o = d.options[i];
    if (!o) return;
    this.dialogs.shift();
    if (!this.dialogs.length) this.mode = this.mode === 'dialog' ? 'play' : this.mode;
    o.act?.();
    if (this.dialogs.length && this.mode === 'play') this.mode = 'dialog';
    this.dirty = true;
  }

  // ───────────────────────── обзор
  computeFov() {
    const m = this.map;
    m.visible.fill(0);
    let r: number;
    if (m.light === 'indoor') r = 9;
    else if (m.light === 'dim') r = 10;
    else if (m.light === 'bright') r = 14;
    else {
      const t = this.timeOfDay();
      r = t === 'день' ? 18 : t === 'закат' ? 11 : 7;
      if (t === 'ночь' && this.hasItem('flashlight')) r += 4;
      if (t === 'ночь' && this.flags.nightVision) r += 3;
    }
    this.visRadius = r;
    const fov = new FOV.PreciseShadowcasting((x, y) => inBounds(m, x, y) && !TILES[getTile(m, x, y)].opaque || (x === this.player.x && y === this.player.y));
    fov.compute(this.player.x, this.player.y, r, (x, y) => {
      if (!inBounds(m, x, y)) return;
      m.visible[idx(m, x, y)] = 1;
      m.explored[idx(m, x, y)] = 1;
    });
    this.dirty = true;
  }
  canSee(x: number, y: number) {
    const m = this.map;
    return inBounds(m, x, y) && m.visible[idx(m, x, y)] === 1;
  }

  // ───────────────────────── действия игрока
  /** Вернёт true, если ход потрачен. */
  playerMove(dx: number, dy: number): boolean {
    const d = DIRS8.findIndex(([a, b]) => a === dx && b === dy);
    if (d >= 0) this.facing = d;
    const p = this.player;
    const nx = p.x + dx, ny = p.y + dy;
    const m = this.map;
    if (!inBounds(m, nx, ny)) return false;
    const other = this.actorAt(nx, ny);
    if (other) {
      if (other.faction === 'enemy') {
        this.attack(p, other);
        return true;
      }
      if (other.tags.has('cat')) return this.petCat(other);
      if (other.faction === 'ally' && !other.tags.has('npc')) {
        // поменяться местами с компаньоном
        other.x = p.x;
        other.y = p.y;
        p.x = nx;
        p.y = ny;
        this.afterStep();
        return true;
      }
      return this.talk(other);
    }
    const t = getTile(m, nx, ny);
    // ложная стена
    if (t === 'fwall') {
      if (this.weapon === 'stick') {
        this.msg('Тук-тук… Звук пустой!', '#e0c080');
        this.revealFalseWall(nx, ny);
        return true;
      }
      this.msg('Стена. Хм, будто бы звенит иначе… Простучать бы её палкой.', '#a0a0a0');
      return false;
    }
    const prop = m.props.find((q) => q.x === nx && q.y === ny);
    if (!TILES[t].walk) {
      if (prop) return this.useProp(prop);
      const sign = m.signs.find((s) => s.x === nx && s.y === ny);
      if (sign) {
        this.readSign(sign);
        return false;
      }
      return false;
    }
    // скользкий мокрый пол
    if (getTile(m, p.x, p.y) === 'wet' && this.rng.chance(0.12)) {
      this.msg('Бени поскальзывается на мокром полу!', '#8ad0f0');
      this.hooks.sfx('slip');
      return true;
    }
    p.x = nx;
    p.y = ny;
    this.afterStep();
    if (prop && TILES[t].walk) this.msg(`Здесь: ${prop.name}. Пробел — действие.`, '#c0c0a0');
    // скейт по асфальту — второй шаг бесплатно
    if (this.hasItem('skate') && t === 'asphalt') {
      this.skateFree = !this.skateFree;
      if (this.skateFree) {
        this.computeFov();
        return false;
      }
    }
    return true;
  }

  afterStep() {
    const p = this.player;
    const m = this.map;
    // предметы на полу
    const here = m.items.filter((it) => it.x === p.x && it.y === p.y);
    for (const it of here) {
      if (this.addItem(it.item, it.qty)) m.items.splice(m.items.indexOf(it), 1);
    }
    if (this.flags.autoPickup) {
      for (const it of m.items.filter((i) => this.dist(i, p) === 1)) {
        if (this.addItem(it.item, it.qty, false)) {
          m.items.splice(m.items.indexOf(it), 1);
          this.msg('Шекель подтаскивает добычу.', '#ff8c1a');
        }
      }
    }
    const t = getTile(m, p.x, p.y);
    if (t === 'exit') {
      const ex = m.exits.find((e) => e.x === p.x && e.y === p.y);
      if (ex) this.useExit(ex);
      return;
    }
    if (t === 'hole') {
      const s = m.secrets.find((q) => q.x === p.x && q.y === p.y && q.kind === 'hole');
      if (s) {
        this.msg('Земля уходит из-под ног… Бени проваливается!', '#c0a070');
        this.enterSecret(s);
        return;
      }
    }
    if (t === 'pipe') this.msg('Старая труба. Нажми «>» (или Пробел), чтобы пролезть вниз.', '#60e060');
    if (t === 'portal') {
      const s = m.secrets.find((q) => q.x === p.x && q.y === p.y);
      if (s) this.tryBurrow(s);
      return;
    }
    const sec = m.secrets.find((q) => q.x === p.x && q.y === p.y && q.kind === 'false' && q.revealed);
    if (sec) {
      this.enterSecret(sec);
      return;
    }
    const sign = m.signs.find((s) => this.dist(s, p) === 1);
    if (sign && !m.flags['signSeen' + sign.x + '_' + sign.y]) {
      m.flags['signSeen' + sign.x + '_' + sign.y] = true;
      this.msg(`Вывеска: ${sign.he}  (R — прочитать)`, '#ffe070');
    }
  }

  useExit(ex: { to: string; tx?: number; ty?: number; label: string }) {
    if (ex.to === '__return') {
      const r = this.map.returnTo;
      if (r) {
        this.msg('Бени возвращается туда, откуда пришёл.', '#c0c0ff');
        this.hooks.sfx('pipe_down');
        this.enterMap(r.map, r.x, r.y);
      }
      return;
    }
    const block = this.levelMod.canExit?.(this, ex.to);
    if (block) {
      this.msg(block, '#ff9060');
      // отступить назад
      const p = this.freeNear(this.player.x, this.player.y);
      if (p) {
        this.player.x = p.x;
        this.player.y = p.y;
      }
      return;
    }
    if (ex.to.startsWith('__level')) {
      this.levelMod.onLevelExit?.(this);
      return;
    }
    const target = this.maps[ex.to];
    let tx = ex.tx, ty = ex.ty;
    if (tx === undefined || ty === undefined) {
      const back = target.exits.find((e) => e.to === this.mapId);
      const pos = back ? this.freeNear(back.x, back.y, target) : null;
      tx = pos?.x ?? target.start.x;
      ty = pos?.y ?? target.start.y;
    }
    this.enterMap(ex.to, tx, ty);
  }

  /** Пробел / Enter: действие с тем, что под ногами или рядом. */
  interact(): boolean {
    const p = this.player;
    const m = this.map;
    const t = getTile(m, p.x, p.y);
    if (t === 'pipe') {
      const s = m.secrets.find((q) => q.x === p.x && q.y === p.y);
      if (s) {
        this.enterSecret(s);
        return true;
      }
    }
    // реквизит под ногами, затем в направлении взгляда, затем рядом
    const [fx, fy] = DIRS8[this.facing];
    const candidates = [
      m.props.find((q) => q.x === p.x && q.y === p.y),
      m.props.find((q) => q.x === p.x + fx && q.y === p.y + fy),
      m.props.find((q) => this.dist(q, p) === 1),
    ];
    const prop = candidates.find(Boolean);
    const who = this.actorAt(p.x + fx, p.y + fy) ?? m.actors.find((a) => a !== p && !a.dead && this.dist(a, p) === 1 && a.faction !== 'enemy');
    if (who && who !== p && who.faction !== 'enemy') {
      if (who.tags.has('cat')) return this.petCat(who);
      return this.talk(who);
    }
    if (prop) return this.useProp(prop);
    const sign = m.signs.find((s) => this.dist(s, p) <= 1);
    if (sign) {
      this.readSign(sign);
      return false;
    }
    this.msg('Здесь нечего делать.', '#808080');
    return false;
  }

  useProp(prop: Prop): boolean {
    return this.levelMod.prop(this, prop);
  }

  talk(a: Actor): boolean {
    const d = this.levelMod.talk(this, a);
    if (d) {
      this.pushDialog(d);
      return false;
    }
    if (a.data.sayLine) this.say(a, a.data.sayLine);
    return false;
  }

  readSign(s: Sign) {
    const auto = this.perks.has('hebrew');
    this.pushDialog({
      who: 'Надпись',
      color: '#ffe070',
      text: s.note ?? '',
      foreign: { orig: s.he, tr: s.tr, ru: s.ru, rtl: s.lang === 'he' || s.lang === undefined },
      options: [{ label: 'Понятно' }],
    });
    if (!auto) this.flags.readCount = (this.flags.readCount ?? 0) + 1;
    this.levelMod.onRead?.(this, s);
  }

  // ───────────────────────── коты
  petCat(c: Actor): boolean {
    const need = c.tags.has('ginger') && this.perks.has('gingerfriend') ? 2 : 3;
    if (c.tags.has('king')) {
      c.pets++;
      this.flags.kingPets = (this.flags.kingPets ?? 0) + 1;
      this.hooks.sfx('cat_purr');
      if (this.flags.kingPets === 99) {
        this.hooks.voice('king_1_ru');
        this.popup('Рыжий Король', '«Мур. Достаточно, смертный.»\n\n(Сообщение от разработчиков: спасибо, что гладишь котов. Бени бы одобрил. — команда «Рыжего Рогалика»)', '#ff7000');
        this.achieve('king99', 'Гладильщик королей');
      } else this.msg(`Рыжий Король благосклонно мурлычет (${this.flags.kingPets}).`, '#ff9030');
      if (c.faction !== 'ally') {
        this.makeCompanion(c);
        this.album.kingFollows = true;
        saveAlbum(this.album);
        this.msg('Рыжий Король теперь будет начинать каждый забег с Бени!', '#ff7000');
      }
      return true;
    }
    if (c.faction === 'ally') {
      this.msg(`${c.name} трётся о ноги.`, c.color);
      this.hooks.sfx('cat_purr');
      return true;
    }
    c.pets++;
    if (c.tags.has('strange')) this.hooks.sfx(c.data.sound === 'bark' ? 'cat_bark' : 'cat_quack');
    else this.hooks.sfx('cat_meow');
    if (c.pets < need) {
      const snd = c.tags.has('strange') ? (c.data.sound === 'bark' ? '«Гав!»' : '«Ква!»') : '«Мяу?»';
      this.msg(`Бени гладит: ${c.name}. ${snd} (${c.pets}/${need})`, c.color);
      if (this.hasItem('bamba') && c.pets === 1) {
        this.msg('…и угощает бамбой. Кот доволен.', '#ffd040');
        this.removeItem('bamba');
        c.pets++;
      }
      return true;
    }
    if (c.tags.has('strange')) {
      this.levelMod.onStrangeCat?.(this, c);
      c.tags.delete('strange');
      c.tags.add('strangeDone');
      this.makeCompanion(c, false);
      return true;
    }
    this.makeCompanion(c);
    this.levelMod.onCatFriend?.(this, c);
    return true;
  }
  makeCompanion(c: Actor, follow = true) {
    c.faction = 'ally';
    c.ai = 'companion';
    c.data.follow = follow;
    if (!follow) c.ai = 'cat';
    this.msg(`${c.name} теперь друг Бени${follow ? ' и ходит следом' : ''}!`, c.color);
  }

  // ───────────────────────── бой
  playerAtk() {
    const w = this.weapon ? ITEMS[this.weapon].atk ?? 0 : 0;
    return this.stats.str + w;
  }
  attack(a: Actor, b: Actor) {
    const isP = a === this.player;
    const hitChance = isP ? 0.85 : 0.75 - (b === this.player ? this.stats.dodge / 100 : 0);
    if (b === this.player && this.invuln > 0) {
      this.msg(`${a.name} бьёт, но Бени неуязвим!`, '#ffff80');
      return;
    }
    if (!this.rng.chance(hitChance)) {
      if (isP) this.msg(`Бени промахивается по: ${b.name}.`, '#a0a0a0');
      else if (b === this.player) this.msg(`${a.name} промахивается.`, '#a0a0a0');
      return;
    }
    let dmg = (isP ? this.playerAtk() : a.atk) + this.rng.int(-1, 1) - b.def;
    if (isP && this.flags.luck && this.rng.chance(0.15)) {
      dmg *= 2;
      this.msg('Удача Апельсина! Двойной урон!', '#ff8c1a');
    }
    if (b.tags.has('chordOnly')) {
      this.msg('Обычные удары его не берут. Нужна гитара!', '#a080ff');
      return;
    }
    dmg = Math.max(1, dmg);
    if (isP) this.hooks.sfx('hit_stick');
    this.damage(b, dmg, a);
  }
  damage(b: Actor, dmg: number, src?: Actor | null, why = '') {
    if (b === this.player) {
      if (this.invuln > 0) return;
      if (this.flags.somBubble) {
        this.flags.somBubble = false;
        this.msg('Пузырь Сомика лопается и спасает от удара!', '#60c0ff');
        return;
      }
    }
    b.hp -= dmg;
    this.fx.push({ kind: 'float', x: b.x, y: b.y, text: '-' + dmg, color: b === this.player ? '#ff4040' : '#ffd060', ttl: 18, max: 18 });
    if (b === this.player) {
      this.hooks.sfx('hurt');
      this.msg(`${src ? src.name : why} — Бени получает ${dmg} урона.`, '#ff7070');
      if (dmg >= 4) this.fx.push({ kind: 'shake', ttl: 8, max: 8 });
    } else if (src === this.player) this.msg(`Бени бьёт: ${b.name} (−${dmg}).`, '#ffd0a0');
    if (b.hp <= 0) this.kill(b, src ?? undefined);
  }
  kill(b: Actor, by?: Actor) {
    if (b === this.player) {
      this.playerDown(by);
      return;
    }
    const prevent = this.levelMod.onDefeat?.(this, b);
    if (prevent) return;
    b.dead = true;
    this.map.actors = this.map.actors.filter((a) => a !== b);
    if (b.faction === 'enemy') {
      this.msg(`${b.name} повержен${b.tags.has('boss') ? '!' : '.'}`, '#c0ffc0');
      this.addXp(b.xp);
      if (this.rng.chance(0.15)) this.dropItemAt(this.rng.pick(['bamba', 'rock', 'pita', 'memory_coin']), b.x, b.y);
    } else this.msg(`${b.name} убегает зализывать раны.`, '#a0a0a0');
    this.levelMod.onKill?.(this, b);
  }
  playerDown(by?: Actor) {
    const p = this.player;
    const save = this.levelMod.onPlayerDown?.(this, by);
    if (save) return;
    if (this.perks.has('family') && !this.usedFamily) {
      this.usedFamily = true;
      p.hp = p.maxHp;
      this.popup('Мама и папа', 'В последний момент рядом оказываются мама Нина и папа Вова. «Мы тебя любим. Обоих». Бени полностью здоров.', '#ff90b0');
      return;
    }
    p.hp = 0;
    this.die(by ? by.name : 'беда');
  }
  die(cause: string) {
    this.hooks.sfx('death');
    this.hooks.music('death');
    const earned = Math.floor(this.stats.xp / 15) + this.stats.lvl + this.secretsFound.size * 2 + this.level * 2;
    this.album.memories += earned;
    this.album.deaths++;
    this.album.pages.unshift({
      date: new Date().toLocaleDateString('ru-RU'),
      level: this.level,
      text: `Уровень ${this.level}, ${this.map.name}. Бени ${this.stats.lvl}-го уровня. Причина: ${cause}. Секретов: ${this.secretsFound.size}. Друзей-котов: ${this.map.actors.filter((a) => a.faction === 'ally' && a.tags.has('cat')).length}. Получено воспоминаний: ${earned}.`,
    });
    this.album.pages = this.album.pages.slice(0, 30);
    saveAlbum(this.album);
    this.flags.deathCause = cause;
    this.flags.deathEarned = earned;
    this.mode = 'dead';
    this.dirty = true;
  }

  heal(a: Actor, n: number) {
    const before = a.hp;
    a.hp = Math.min(a.maxHp, a.hp + n);
    if (a.hp > before) this.fx.push({ kind: 'float', x: a.x, y: a.y, text: '+' + (a.hp - before), color: '#60ff60', ttl: 18, max: 18 });
  }

  // ───────────────────────── бросок, прыжок
  throwRock(): boolean {
    if (!this.hasItem('rock')) {
      this.msg('Нет камней. Их можно найти на земле.', '#a0a0a0');
      return false;
    }
    const [dx, dy] = DIRS8[this.facing];
    const p = this.player;
    let x = p.x, y = p.y;
    this.removeItem('rock');
    this.hooks.sfx('throw_rock');
    for (let i = 1; i <= 7; i++) {
      x += dx;
      y += dy;
      const m = this.map;
      if (!inBounds(m, x, y)) break;
      const prop = m.props.find((q) => q.x === x && q.y === y);
      if (prop && this.levelMod.onThrowHit?.(this, prop)) {
        this.fx.push({ kind: 'laser', x: p.x, y: p.y, x2: x, y2: y, color: '#b0a090', ttl: 6, max: 6 });
        return true;
      }
      const a = this.actorAt(x, y);
      if (a && a !== p) {
        this.fx.push({ kind: 'laser', x: p.x, y: p.y, x2: x, y2: y, color: '#b0a090', ttl: 6, max: 6 });
        if (a.tags.has('chordOnly')) {
          this.msg('Камень отскакивает от призрака.', '#a080ff');
          return true;
        }
        this.damage(a, 3 + this.rng.int(0, 2), p);
        if (this.perks.has('stone') && !a.dead) {
          a.stun = 2;
          this.msg(`${a.name} оглушён!`, '#ffff80');
          if (this.rng.chance(0.2)) {
            this.msg('…где-то звенит разбитое стекло. Ой.', '#a0e0ff');
            this.hooks.sfx('glass_break');
          }
        }
        if (a.faction === 'neutral' && !a.dead && !a.tags.has('npc')) a.faction = 'enemy';
        return true;
      }
      if (TILES[getTile(m, x, y)].opaque || getTile(m, x, y) === 'window') {
        if (getTile(m, x, y) === 'window') {
          setTile(m, x, y, 'broken');
          this.hooks.sfx('glass_break');
          this.msg('Дзынь! Окно разбито.', '#a0e0ff');
          this.levelMod.onWindowBroken?.(this, x, y);
        }
        break;
      }
    }
    this.dropItemAt('rock', x - dx, y - dy);
    return true;
  }

  jump(): boolean {
    const [dx, dy] = DIRS8[this.facing];
    const p = this.player;
    const m = this.map;
    const fromRoof = getTile(m, p.x, p.y) === 'roof';
    const range = Math.min(4, 1 + Math.floor(this.stats.jump / 2) + (fromRoof ? 1 : 0));
    let lx = p.x, ly = p.y;
    for (let i = 1; i <= range; i++) {
      const x = p.x + dx * i, y = p.y + dy * i;
      if (!inBounds(m, x, y)) break;
      const t = getTile(m, x, y);
      // невидимый вход в воздухе
      const air = m.secrets.find((s) => s.kind === 'air' && s.x === x && s.y === y);
      if (air) {
        this.msg('В прыжке Бени врезается во что-то невидимое… Дверь в воздухе!', '#e0e0ff');
        this.hooks.sfx('jump_roof');
        air.revealed = true;
        this.enterSecret(air);
        return true;
      }
      if ((TILES[t].opaque && t !== 'bush' && t !== 'reeds') || t === 'window' || t === 'broken' || t === 'wire' || t === 'void') break;
      if (TILES[t].walk && !this.actorAt(x, y)) {
        lx = x;
        ly = y;
      }
    }
    if (lx === p.x && ly === p.y) {
      this.msg('Некуда прыгать.', '#a0a0a0');
      return false;
    }
    const handled = this.levelMod.onJump?.(this, p.x, p.y, lx, ly, fromRoof);
    if (handled) return true;
    p.x = lx;
    p.y = ly;
    this.msg('Прыг!', '#a0ffa0');
    this.afterStep();
    return true;
  }

  // ───────────────────────── секреты и норы
  revealFalseWall(x: number, y: number) {
    const m = this.map;
    const s = m.secrets.find((q) => q.kind === 'false' && q.x === x && q.y === y);
    setTile(m, x, y, 'door');
    if (s) {
      s.revealed = true;
      this.msg('Ложная стена! За ней проход.', '#e080ff');
      this.hooks.sfx('burrow_reveal');
    }
  }

  enterSecret(s: Secret) {
    const target = this.maps[s.target];
    if (!target) return;
    target.returnTo = { map: this.mapId, x: this.player.x, y: this.player.y };
    // для дыр и труб — вернуть на соседнюю клетку, чтобы не провалиться снова
    if (s.kind === 'hole' || s.kind === 'air' || s.kind === 'burrow') {
      const f = this.freeNear(this.player.x, this.player.y);
      if (f) target.returnTo = { map: this.mapId, x: f.x, y: f.y };
    }
    this.hooks.sfx('pipe_down');
    this.foundSecret(s.id, s.name);
    this.enterMap(s.target, target.start.x, target.start.y);
  }

  tryBurrow(s: Secret) {
    const key = s.key;
    if (key && !this.hasItem(key) && !this.album.keyCopies.includes(key)) {
      const kn = ITEMS[key].name;
      this.msg(`Нора заперта: на ней замочная скважина. Нужен ${kn}.`, '#e080ff');
      const note = `${this.map.name}: нора «${s.name}» — нужен ${kn}`;
      if (!this.album.burrowNotes.includes(note)) {
        this.album.burrowNotes.push(note);
        saveAlbum(this.album);
        this.msg('Бени запоминает «где» и «что нужно» (запись в Альбоме).', '#c0a0ff');
      }
      return;
    }
    if (key && this.hasItem(key) && !this.album.keyCopies.includes(key)) {
      this.album.keyCopies.push(key);
      saveAlbum(this.album);
    }
    this.msg(`Ключ поворачивается… Бени ныряет в нору: ${s.name}!`, '#e080ff');
    this.enterSecret(s);
  }

  /** L — присмотреться (2 хода). */
  look(): boolean {
    const p = this.player;
    const m = this.map;
    this.flags.lookTurns = 2;
    const range = this.hasItem('binoculars') ? 6 : 3;
    const lit = m.light !== 'outdoor' || !this.isNight() || this.hasItem('flashlight') || this.turn % DAY_LEN > 330; // ночью светит луна во второй половине
    let found = false;
    let near = false;
    for (const s of m.secrets) {
      if (s.kind !== 'burrow' || s.revealed) continue;
      if (s.water) {
        const nearWater = this.dist(p, s) <= range;
        const mirror = this.hasItem('mirror') && DIRS8.some(([dx, dy]) => TILES[getTile(m, p.x + dx, p.y + dy)].smooth) && this.dist(p, s) <= range + 2;
        if (nearWater || mirror) {
          if (!lit) {
            this.msg('Слишком темно — вода ничего не отражает. Нужен свет (фонарик или луна).', '#8080c0');
            near = true;
            continue;
          }
          if (m.flags.ripple && m.flags.ripple > this.turn) {
            this.msg('Вода мутная, по ней идёт рябь. Подожди пару ходов.', '#80a0c0');
            near = true;
            continue;
          }
          s.revealed = true;
          setTile(m, s.x, s.y, 'portal');
          found = true;
          this.msg('Вода показывает отражённый мир, вверх ногами… и в нём — контур норы! Шагни в отражение.', '#e080ff');
        }
      } else if (s.viewX !== undefined && s.viewY !== undefined) {
        if (p.x === s.viewX && p.y === s.viewY && this.facing === s.dir) {
          s.revealed = true;
          setTile(m, s.x, s.y, 'portal');
          found = true;
          this.msg('Воздух идёт рябью, проступает контур… Кроличья нора!', '#e080ff');
        } else if (this.dist(p, { x: s.viewX, y: s.viewY }) <= 2) {
          near = true;
          this.fx.push({ kind: 'spark', x: s.x, y: s.y, color: '#ffffff', ttl: 10, max: 10 });
          this.msg('Что-то не так… Попробуй под другим углом.', '#c0a0ff');
        }
      }
    }
    if (found) {
      this.hooks.sfx('burrow_reveal');
      this.fx.push({ kind: 'flash', color: '#e080ff', ttl: 10, max: 10 });
    } else if (!near) {
      if (this.perks.has('eagle')) {
        const b = m.secrets.find((s) => s.kind === 'burrow' && !s.revealed);
        if (b) {
          const d = this.dirTo(p, b);
          this.msg(`Орлиный глаз: нора где-то на ${DIR_NAMES[d]}е.`, '#ffd060');
        } else this.msg('Ты присматриваешься… ничего необычного.', '#a0a0a0');
      } else this.msg('Ты присматриваешься… ничего необычного.', '#a0a0a0');
    }
    return true;
  }
  dirTo(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
    const i = DIRS8.findIndex(([x, y]) => x === dx && y === dy);
    return i < 0 ? 0 : i;
  }
  markNearestBurrow(m: GameMap) {
    const b = m.secrets.find((s) => s.kind === 'burrow' && !s.revealed);
    if (b) {
      m.flags.eyeMark = { x: b.viewX ?? b.x, y: b.viewY ?? b.y };
      this.msg('Папа помечает «глаз» на карте: где-то тут стоит присмотреться.', '#80b0ff');
    }
  }

  // ───────────────────────── гитара
  chordsKnown(): string[] {
    if (!this.hasItem('guitar')) return [];
    const c = ['E', 'A'];
    if (this.flags.chordG) c.push('G');
    if (this.stats.rock >= 6 || this.flags.chordPower) c.push('P');
    return c;
  }
  playChord(c: string): boolean {
    const cost: Record<string, number> = { E: 2, A: 3, G: 3, P: 5 };
    if (this.stats.drive < cost[c]) {
      this.msg('Не хватает Драйва. Он копится за ходы, у рок-постеров и от рок-кассет.', '#ff8080');
      return false;
    }
    this.stats.drive -= cost[c];
    const p = this.player;
    const m = this.map;
    const rock = this.stats.rock;
    const bonus = this.levelMod.chordBonus?.(this) ?? 0;
    const firstInFight = !this.flags.riffUsed && m.actors.some((a) => a.faction === 'enemy' && this.dist(a, p) <= 6);
    if (this.perks.has('riff') && firstInFight) {
      this.flags.riffUsed = true;
      for (const a of m.actors) if (a.faction === 'enemy' && this.dist(a, p) <= 3) a.stun = 2;
      this.msg('Громкий рифф! Враги рядом в ужасе.', '#ff60ff');
    }
    if (c === 'E') {
      this.hooks.sfx('chord_e');
      this.msg('Аккорд E (Ми) — звуковая волна!', '#ff8030');
      this.fx.push({ kind: 'wave', x: p.x, y: p.y, r: 3, color: '#ff8030', ttl: 14, max: 14 });
      for (const a of [...m.actors]) {
        if (a === p || a.faction !== 'enemy' || this.dist(a, p) > 2) continue;
        this.damage(a, 2 + Math.floor(rock / 2) + bonus, p);
        if (!a.dead) this.knockback(a, p, 2);
      }
      for (const s of m.secrets) if (s.kind === 'false' && !s.revealed && this.dist(s, p) <= 3) this.revealFalseWall(s.x, s.y);
    } else if (c === 'A') {
      this.hooks.sfx('chord_a');
      this.msg('Аккорд A (Ля) — тёплый звон лечит всех рядом.', '#60ff90');
      this.fx.push({ kind: 'wave', x: p.x, y: p.y, r: 2, color: '#60ff90', ttl: 14, max: 14 });
      for (const a of m.actors) if ((a === p || a.faction === 'ally') && this.dist(a, p) <= 2) this.heal(a, 4 + Math.floor(rock / 2));
    } else if (c === 'G') {
      this.hooks.sfx('chord_g');
      this.msg('Аккорд G (Соль) — все коты этажа бегут на помощь!', '#ffb030');
      for (const a of m.actors) {
        if (!a.tags.has('cat')) continue;
        if (a.faction === 'neutral') {
          a.data.tempAlly = 25;
          a.faction = 'ally';
          a.ai = 'companion';
        }
        if (a.tags.has('strange') || a.tags.has('strangeDone')) {
          const s = m.secrets.find((q) => q.kind === 'burrow' && !q.revealed && this.dist(q, a) <= 12);
          if (s) {
            const d = this.dirTo(a, s);
            this.msg(`${a.name} ${a.data.sound === 'bark' ? 'гавкает' : 'квакает'} куда-то на ${DIR_NAMES[d]}…`, a.color);
          } else this.msg(`${a.name}: «${a.data.sound === 'bark' ? 'Гав' : 'Ква'}!» (со стороны: ${DIR_NAMES[this.dirTo(p, a)]})`, a.color);
        }
      }
    } else if (c === 'P') {
      this.hooks.sfx('chord_power');
      const [dx, dy] = DIRS8[this.facing];
      this.msg('POWER CHORD! Огромный урон по прямой. Соседи проснулись…', '#ff3030');
      this.fx.push({ kind: 'laser', x: p.x, y: p.y, x2: p.x + dx * 8, y2: p.y + dy * 8, color: '#ff3030', ttl: 12, max: 12 });
      this.fx.push({ kind: 'shake', ttl: 10, max: 10 });
      for (let i = 1; i <= 8; i++) {
        const a = this.actorAt(p.x + dx * i, p.y + dy * i);
        if (a && a.faction === 'enemy') this.damage(a, 7 + rock + bonus, p);
      }
      this.levelMod.onLoud?.(this);
    }
    // соло: E-A-G-E
    this.chordSeq.push(c);
    if (this.chordSeq.length > 4) this.chordSeq.shift();
    if (this.chordSeq.join('') === 'EAGE') {
      this.chordSeq = [];
      this.invuln = 10;
      this.hooks.sfx('solo');
      this.msg('СОЛО! E-A-G-E… 10 ходов неуязвимости и лазерное шоу!', '#ff40ff');
      for (let i = 0; i < 8; i++) {
        const [dx, dy] = DIRS8[i];
        this.fx.push({ kind: 'laser', x: p.x, y: p.y, x2: p.x + dx * 10, y2: p.y + dy * 10, color: ['#ff40ff', '#40ffff', '#ffff40'][i % 3], ttl: 30, max: 30 });
      }
      this.achieve('solo', 'Соло на детской гитаре');
    }
    this.levelMod.onChord?.(this, c);
    return true;
  }
  knockback(a: Actor, from: Actor, n: number) {
    const dx = Math.sign(a.x - from.x), dy = Math.sign(a.y - from.y);
    for (let i = 0; i < n; i++) {
      const nx = a.x + dx, ny = a.y + dy;
      if (!this.isWalkable(nx, ny) || this.actorAt(nx, ny)) break;
      a.x = nx;
      a.y = ny;
    }
  }

  // ───────────────────────── предметы
  useItem(id: string): boolean {
    const d = ITEMS[id];
    if (!d || !this.hasItem(id)) return false;
    const p = this.player;
    if (d.kind === 'food') {
      this.stats.hunger = Math.min(100, this.stats.hunger + (d.food ?? 0));
      let heal = d.heal ?? 0;
      if (d.healPct) heal = Math.ceil((p.maxHp * d.healPct) / 100);
      if (id === 'cutlet' && this.perks.has('nina')) heal *= 2;
      this.heal(p, heal);
      this.removeItem(id);
      if (id === 'mammoth') {
        this.invuln = Math.max(this.invuln, 3);
        this.hooks.sfx('eat_mammoth');
        this.msg('Мамонтовое мясо! Бени полностью здоров и 3 хода неуязвим.', '#ff8060');
      } else if (id === 'watermelon') {
        for (const a of this.map.actors) if (a.faction === 'ally' && this.dist(a, p) <= 2) this.heal(a, 6);
        this.msg('Арбуз! Бени делится с друзьями.', '#ff4060');
      } else this.msg(`Бени ест: ${d.name}.`, d.color);
      return true;
    }
    if (d.kind === 'weapon') {
      this.weapon = this.weapon === id ? null : id;
      this.msg(this.weapon ? `В руках: ${d.name}.` : 'Руки свободны.', d.color);
      return false;
    }
    if (id === 'cassette') {
      this.stats.drive = this.stats.maxDrive;
      this.removeItem(id);
      this.msg('Рок-кассета в плеере! Драйв полон.', '#ff60ff');
      return true;
    }
    if (id === 'rock') return this.throwRock();
    if (id === 'cassette_album') {
      this.flags.secretTrack = true;
      this.map.flags.musicOverride = 'dim_rock';
      this.hooks.music('dim_rock');
      this.msg('Бени ставит кассету. Играет секретный трек!', '#ff2020');
      this.achieve('cassette', 'Секретный трек');
      return false;
    }
    this.msg(d.desc, d.color);
    return false;
  }

  // ───────────────────────── ход мира
  endTurn() {
    this.turn++;
    const p = this.player;
    const m = this.map;
    const inDim = !!m.isDimension;
    // голод
    if (this.turn % (inDim ? 8 : 4) === 0) this.stats.hunger = Math.max(0, this.stats.hunger - 1);
    if (this.stats.hunger === 0 && this.turn % 5 === 0) this.damage(p, 1, null, 'Голод');
    if (this.stats.hunger === 20 && this.turn % 4 === 0) this.msg('Бени проголодался. Пора бы поесть.', '#ffd040');
    // драйв
    const poster = DIRS8.some(([dx, dy]) => getTile(m, p.x + dx, p.y + dy) === 'poster');
    if (this.hasItem('guitar') && (this.turn % (poster ? 1 : 4) === 0)) this.stats.drive = Math.min(this.stats.maxDrive, this.stats.drive + 1);
    // неуязвимость
    if (this.invuln > 0) this.invuln--;
    // вода
    if (getTile(m, p.x, p.y) === 'deep') {
      this.breath--;
      if (this.breath === 3) this.msg('Воздух кончается!', '#60c0ff');
      if (this.breath < 0) {
        if (this.flags.somSpirit && !this.flags.somSaved) {
          this.flags.somSaved = true;
          const s = this.nearestDry(p.x, p.y);
          p.x = s.x;
          p.y = s.y;
          this.breath = this.maxBreath();
          this.popup('Дух реки', 'Что-то большое и тёплое выталкивает Бени на берег. «Буль… друг реки не тонет».', '#60a0a0');
        } else this.damage(p, 2, null, 'Вода');
      }
    } else this.breath = this.maxBreath();
    // стояние на месте (для событий вроде призрака у вывески)
    this.levelMod.onTurn?.(this);
    // ИИ
    for (const a of [...m.actors]) {
      if (a === p || a.dead) continue;
      a.energy += a.speed;
      while (a.energy >= 1 && !a.dead && this.mode !== 'dead') {
        a.energy -= 1;
        this.act(a);
      }
      if (a.sayTtl) {
        a.sayTtl--;
        if (a.sayTtl <= 0) a.say = undefined;
      }
      if (a.data.tempAlly) {
        a.data.tempAlly--;
        if (a.data.tempAlly <= 0 && !a.data.follow) {
          a.faction = 'neutral';
          a.ai = 'cat';
        }
      }
    }
    if (this.mode === 'dead') return;
    if (p.sayTtl) {
      p.sayTtl--;
      if (p.sayTtl <= 0) p.say = undefined;
    }
    // музыка дня/ночи
    if (this.turn % DAY_LEN === 290) this.msg('Наступает ночь. Слышно сверчков и шакалов.', '#8080ff');
    if (this.turn % DAY_LEN === 0) this.msg('Рассвет. Новый день в Маскерет-Батье.', '#ffd080');
    this.hooks.music(this.currentMusic());
    this.computeFov();
  }
  nearestDry(x: number, y: number) {
    const m = this.map;
    for (let r = 1; r < 20; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const t = getTile(m, x + dx, y + dy);
          if (TILES[t].walk && !TILES[t].water && !this.actorAt(x + dx, y + dy)) return { x: x + dx, y: y + dy };
        }
    return { x: m.start.x, y: m.start.y };
  }

  /** Полный ход игрока: действие + ход мира. */
  doTurn(took: boolean) {
    if (!took || this.mode === 'dead') return;
    this.endTurn();
    if (this.flags.lookTurns) {
      // «Присмотреться» занимает 2 хода
      this.flags.lookTurns = 0;
      if ((this.mode as Mode) !== 'dead') this.endTurn();
    }
    this.dirty = true;
  }

  // ───────────────────────── ИИ
  act(a: Actor) {
    if (a.stun > 0) {
      a.stun--;
      return;
    }
    if (a.laugh > 0) {
      a.laugh--;
      return;
    }
    const p = this.player;
    const m = this.map;
    const custom = this.levelMod.ai?.(this, a);
    if (custom) return;
    switch (a.ai) {
      case 'still':
      case 'none':
        return;
      case 'npc':
      case 'wander':
        if (this.rng.chance(0.3)) this.wander(a, a.data.home ?? null, 4);
        return;
      case 'som':
        if (this.rng.chance(0.5)) {
          const [dx, dy] = this.rng.pick(DIRS8);
          if (TILES[getTile(m, a.x + dx, a.y + dy)].water && !this.actorAt(a.x + dx, a.y + dy)) {
            a.x += dx;
            a.y += dy;
          }
        }
        return;
      case 'cat': {
        // кот смотрит в пустоту в сторону норы
        if (a.data.lookDir !== undefined && this.rng.chance(0.7)) return;
        if (a.faction === 'enemy') return this.chase(a, p);
        if (this.rng.chance(0.4)) this.wander(a, a.data.home ?? null, 5);
        return;
      }
      case 'companion': {
        const enemy = this.nearestEnemy(a, 6);
        if (enemy) {
          if (this.dist(a, enemy) === 1) return this.attack(a, enemy);
          return this.stepTowards(a, enemy.x, enemy.y);
        }
        if (this.dist(a, p) > 2) return this.stepTowards(a, p.x, p.y);
        if (this.rng.chance(0.3)) this.wander(a, { x: p.x, y: p.y }, 2);
        return;
      }
      case 'crow': {
        if (this.dist(a, p) === 1 && this.rng.chance(0.4)) {
          const shiny = ['memory_coin', 'coin_roman', 'pick', 'patch', 'mirror'].find((i) => this.hasItem(i) && i !== 'memory_coin');
          if (shiny && this.rng.chance(0.3)) {
            this.removeItem(shiny);
            a.data.stolen = shiny;
            this.msg(`Ворона утащила: ${ITEMS[shiny].name}! Догони её!`, '#8080c0');
            return;
          }
        }
        if (this.dist(a, p) <= 6 && this.canSee(a.x, a.y)) return this.chase(a, p);
        this.wander(a, null, 8);
        return;
      }
      case 'patrol': {
        const sees = this.dist(a, p) <= 5 && this.canSee(a.x, a.y) && !this.hiddenInShadow();
        if (sees && a.data.catches) {
          this.say(a, a.data.sayLine ?? 'Эй!');
          this.levelMod.onCaught?.(this, a);
          return;
        }
        if (sees) {
          if (!a.data.alerted) {
            a.data.alerted = true;
            this.say(a, a.data.sayLine ?? 'Стой!');
            if (a.kind === 'guard') this.hooks.voice('guard_1_ru');
          }
          return this.chase(a, p);
        }
        a.data.alerted = false;
        return this.patrol(a);
      }
      case 'dog':
        if (this.dist(a, p) <= 4) {
          if (this.rng.chance(0.3)) {
            this.say(a, 'Гав! Гав!', 3);
            this.hooks.sfx('dog_bark');
          }
          return this.chase(a, p);
        }
        this.wander(a, a.data.home ?? null, 3);
        return;
      case 'shadow':
      case 'melee':
      case 'french':
      default:
        if (a.faction !== 'enemy') return this.wander(a, null, 4);
        if (a.tags.has('night') && !this.isNight() && m.light === 'outdoor') {
          // шакалы днём уходят
          a.dead = true;
          m.actors = m.actors.filter((x) => x !== a);
          return;
        }
        {
          const target = this.nearestFoe(a, 10);
          if (target && (this.canSee(a.x, a.y) || this.dist(a, target) <= 3 || a.tags.has('boss'))) {
            if (a.ai === 'french' && a.data.lines && this.rng.chance(0.25)) this.say(a, this.rng.pick(a.data.lines), 3);
            return this.chase(a, target);
          }
          this.wander(a, null, 6);
        }
    }
  }
  hiddenInShadow() {
    // перк «Холодная голова» (от Энбара): в тени (ночью или в кустах) Бени не видно
    if (!this.perks.has('coldhead')) return false;
    const t = getTile(this.map, this.player.x, this.player.y);
    return this.isNight() || t === 'bush' || t === 'reeds';
  }
  nearestEnemy(a: Actor, r: number): Actor | undefined {
    let best: Actor | undefined, bd = r + 1;
    for (const b of this.map.actors) {
      if (b.faction !== 'enemy' || b.dead) continue;
      const d = this.dist(a, b);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }
  nearestFoe(a: Actor, r: number): Actor | undefined {
    let best: Actor | undefined, bd = r + 1;
    for (const b of this.map.actors) {
      if (b.dead || (b.faction !== 'player' && b.faction !== 'ally')) continue;
      const d = this.dist(a, b);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }
  chase(a: Actor, t: Actor) {
    if (this.dist(a, t) === 1) return this.attack(a, t);
    this.stepTowards(a, t.x, t.y);
  }
  stepTowards(a: Actor, tx: number, ty: number) {
    const opts = DIRS8.map(([dx, dy]) => ({ x: a.x + dx, y: a.y + dy }))
      .filter((q) => this.isWalkable(q.x, q.y) && !this.actorAt(q.x, q.y) && getTile(this.map, q.x, q.y) !== 'exit' && (a.data.canSwim || !TILES[getTile(this.map, q.x, q.y)].water || a.ai === 'som'))
      .sort((u, v) => Math.hypot(u.x - tx, u.y - ty) - Math.hypot(v.x - tx, v.y - ty));
    const cur = Math.hypot(a.x - tx, a.y - ty);
    const best = opts[0];
    if (best && Math.hypot(best.x - tx, best.y - ty) < cur + 0.5) {
      a.x = best.x;
      a.y = best.y;
    }
  }
  wander(a: Actor, home: { x: number; y: number } | null, r: number) {
    const [dx, dy] = this.rng.pick(DIRS8);
    const nx = a.x + dx, ny = a.y + dy;
    if (home && Math.max(Math.abs(nx - home.x), Math.abs(ny - home.y)) > r) return this.stepTowards(a, home.x, home.y);
    const t = getTile(this.map, nx, ny);
    if (this.isWalkable(nx, ny) && !this.actorAt(nx, ny) && t !== 'exit' && t !== 'portal' && t !== 'hole' && !TILES[t].water) {
      a.x = nx;
      a.y = ny;
    }
  }
  patrol(a: Actor) {
    const pts: { x: number; y: number }[] = a.data.route ?? [];
    if (!pts.length) return this.wander(a, null, 6);
    const i = a.data.ri ?? 0;
    const tgt = pts[i];
    if (a.x === tgt.x && a.y === tgt.y) a.data.ri = (i + 1) % pts.length;
    else {
      const bx = a.x, by = a.y;
      this.stepTowards(a, tgt.x, tgt.y);
      if (a.x === bx && a.y === by) a.data.ri = (i + 1) % pts.length;
    }
  }
}

export type { MapItem, Secret, TileId };
