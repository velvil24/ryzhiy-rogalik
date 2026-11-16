// Играбельные заготовки уровней 2–5 (ВРЕМЕННО). Каждая — процедурный этаж в стиле своего мира,
// со сценарными мини-боссом и боссом, точкой отдыха, странной говорящей рыбой (Сомик) и выходом дальше.
import type { Game, Dialog } from '../engine/game';
import type { LevelModule } from './registry';
import type { Actor, GameMap, Prop } from '../engine/types';
import { setTile, getTile } from '../engine/types';
import { Rng } from '../engine/rng';
import { ensureReachable, fillRect, findFree, room, scatter } from '../engine/gen';
import { makeActor } from '../entities/actors';
import { newMap } from '../engine/types';
import type { TileId } from '../engine/tiles';

export interface StubSpec {
  num: number;
  name: string;
  stage: string;
  intro: string[];
  floor: TileId;
  wall: TileId;
  deco: TileId[];
  water: TileId;
  music: string;
  ambience: string;
  signs: { he: string; tr: string; ru: string; lang?: 'he' | 'en' | 'ru' }[];
  mini: { name: string; color: string; ch: string; lines: string[]; hp: number; atk: number };
  boss: { name: string; color: string; ch: string; lines: string[]; hp: number; atk: number; intro: string };
  rest: string;
  enemies: { name: string; ch: string; color: string; hp: number; atk: number }[];
  npcs: { kind: string; name: string; line: string }[];
  somPlace: string;
  final?: boolean;
  newChord?: string;
}

function buildStub(g: Game, s: StubSpec): GameMap {
  const rng = new Rng(g.seed + s.num * 7919);
  const W = 64, H = 40;
  const m = newMap('l' + s.num, s.name, W, H, s.wall);
  m.music = s.music;
  m.ambience = s.ambience;
  m.light = 'indoor';
  // комнаты-коридоры
  const rooms: [number, number, number, number][] = [];
  for (let t = 0; t < 200 && rooms.length < 9; t++) {
    const w = rng.int(7, 13), h = rng.int(5, 9);
    const x = rng.int(1, W - w - 2), y = rng.int(1, H - h - 2);
    if (rooms.some(([a, b, c, d]) => x < a + c + 1 && x + w + 1 > a && y < b + d + 1 && y + h + 1 > b)) continue;
    rooms.push([x, y, w, h]);
  }
  rooms.sort((a, b) => a[0] - b[0]);
  for (const [x, y, w, h] of rooms) fillRect(m, x, y, w, h, s.floor);
  for (let i = 1; i < rooms.length; i++) {
    const [ax, ay, aw, ah] = rooms[i - 1], [bx, by, bw, bh] = rooms[i];
    let x = ax + (aw >> 1), y = ay + (ah >> 1);
    const tx = bx + (bw >> 1), ty = by + (bh >> 1);
    while (x !== tx) {
      setTile(m, x, y, s.floor);
      x += Math.sign(tx - x);
    }
    while (y !== ty) {
      setTile(m, x, y, s.floor);
      y += Math.sign(ty - y);
    }
  }
  for (const d of s.deco) scatter(m, rng, d, 14, [s.floor]);
  const [r0, rLast, rMid, rRest, rSom] = [rooms[0], rooms[rooms.length - 1], rooms[Math.floor(rooms.length / 2)], rooms[1], rooms[rooms.length - 2]];
  m.start = { x: r0[0] + 1, y: r0[1] + 1 };
  // вода и Сомик
  fillRect(m, rSom[0] + 1, rSom[1] + 1, Math.min(4, rSom[2] - 2), 2, s.water);
  const fish = makeActor('som', rSom[0] + 1, rSom[1] + 1, { name: 'Странная говорящая рыба' });
  fish.ai = 'still';
  m.actors.push(fish);
  // точка отдыха
  setTile(m, rRest[0] + 2, rRest[1] + 2, 'shalash');
  m.props.push({ x: rRest[0] + 2, y: rRest[1] + 2, id: 'rest', name: s.rest });
  // вывески
  for (const sg of s.signs) {
    const p = findFree(m, rng, [s.floor]);
    setTile(m, p.x, p.y, 'sign');
    m.signs.push({ x: p.x, y: p.y, ...sg });
  }
  // NPC
  for (const n of s.npcs) {
    const p = findFree(m, rng, [s.floor]);
    const a = makeActor(n.kind, p.x, p.y, { name: n.name });
    a.ai = 'still';
    a.data.line = n.line;
    m.actors.push(a);
  }
  // враги
  for (let i = 0; i < 8; i++) {
    const e = rng.pick(s.enemies);
    const p = findFree(m, rng, [s.floor], undefined, (x, y) => Math.abs(x - m.start.x) + Math.abs(y - m.start.y) < 10);
    m.actors.push(makeActor('stub_mini', p.x, p.y, { name: e.name, ch: e.ch, color: e.color, hp: e.hp, maxHp: e.hp, atk: e.atk, xp: 6, tags: new Set() }));
  }
  // мини-босс в середине, босс в последней комнате
  const mb = makeActor('stub_mini', rMid[0] + (rMid[2] >> 1), rMid[1] + (rMid[3] >> 1), { name: s.mini.name, ch: s.mini.ch, color: s.mini.color, hp: s.mini.hp, maxHp: s.mini.hp, atk: s.mini.atk });
  mb.data.lines = s.mini.lines;
  mb.data.mini = true;
  m.actors.push(mb);
  const bx = rLast[0] + (rLast[2] >> 1), by = rLast[1] + (rLast[3] >> 1);
  const boss = makeActor('stub_boss', bx, by, { name: s.boss.name, ch: s.boss.ch, color: s.boss.color, hp: s.boss.hp, maxHp: s.boss.hp, atk: s.boss.atk });
  boss.data.lines = s.boss.lines;
  boss.data.boss = true;
  boss.ai = 'still';
  m.actors.push(boss);
  m.flags.bossRoom = rLast;
  // выход появится после победы над боссом
  m.flags.exitAt = { x: rLast[0] + rLast[2] - 2, y: rLast[1] + rLast[3] - 2 };
  // еда
  for (let i = 0; i < 5; i++) {
    const p = findFree(m, rng, [s.floor]);
    m.items.push({ x: p.x, y: p.y, item: rng.pick(['bamba', 'pita', 'watermelon', 'cassette', 'rock']), qty: 1 });
  }
  ensureReachable(m, [...m.actors, ...m.props, m.flags.exitAt], s.floor);
  return m;
}

export function makeStubLevel(s: StubSpec): LevelModule {
  return {
    num: s.num,
    name: s.name,
    stage: s.stage,
    intro: [...s.intro, 'ВРЕМЕННАЯ ЗАГОТОВКА: этот уровень играбелен, но пока упрощён. Полный сценарий — в файлах сценария, реализация — в следующих версиях.'],
    build(g: Game) {
      const m = buildStub(g, s);
      g.maps[m.id] = m;
      // взросление
      g.player.maxHp += 5;
      g.player.hp = g.player.maxHp;
      g.stats.hunger = 100;
      if (s.num <= 4) {
        const floor = g.album.unlocks.somPhoto ? 2 : 1;
        if (g.somMemory > floor) g.somMemory = floor;
        g.flags['memoryStep' + s.num] = 0;
      }
      if (s.newChord) g.flags['chord_' + s.newChord] = true;
      return { startMap: m.id };
    },
    talk(g: Game, a: Actor): Dialog | null {
      if (a.kind === 'som') {
        const k = 'memoryStep' + s.num;
        const step = g.flags[k] ?? 0;
        const steps = ['Встреча', 'Намёк', 'Якорь', 'Рассказ', 'Песня'];
        const lines = [
          `В ${s.somPlace} плавает странная говорящая рыба. «Буль… Мы знакомы?» Бени не узнаёт её.`,
          '«Буль… Речка. Эвкалипты. Ничего не напоминает?»',
          g.hasItem('pebble') || g.hasItem('coin_roman') || g.hasItem('string') ? 'Бени достаёт якорь памяти — и что-то шевелится в голове.' : '«Принеси что-нибудь из детства, буль…» (якорь: галька, монета, струна…)',
          '«Был мальчик, который нырял за струной. Это был ты, Бени».',
          g.hasItem('guitar') ? 'Бени играет «Рыжий рифф». Рыба подпевает пузырями. «Сомик!!!» — вспоминает Бени.' : '«Сыграй мне, Бени…» (нужна гитара)',
        ];
        const can = step < 5 && !(step === 2 && !(g.hasItem('pebble') || g.hasItem('coin_roman') || g.hasItem('string'))) && !(step === 4 && !g.hasItem('guitar'));
        return {
          who: 'Странная говорящая рыба', color: '#60a0a0', text: step >= 5 ? '«Буль. Я же говорил — вспомнишь». Это Сомик!' : lines[step],
          options: [
            ...(can ? [{ label: `Знакомство заново: ${steps[step]}`, act: () => { g.flags[k] = step + 1; g.somMemory = Math.min(5, g.somMemory + 1); g.msg(`Память о Сомике: ${g.somMemory}/5`, '#60c0ff'); if (g.somMemory === 3) { g.flags.somBubble = true; g.msg('Пузырь Сомика: щит на 1 удар.', '#60c0ff'); } } }] : []),
            { label: 'Пока' },
          ],
        };
      }
      if (a.data.line) return { who: a.name, color: a.color, text: a.data.line, options: [{ label: 'Пока' }] };
      return null;
    },
    prop(g: Game, p: Prop) {
      if (p.id === 'rest') {
        g.heal(g.player, Math.ceil(g.player.maxHp * (g.perks.has('shalash') ? 0.5 : 0.3)));
        g.msg(`${s.rest}: Бени отдыхает.`, '#d0a060');
        return true;
      }
      if (p.id === 'next') {
        g.flags.nextLevelPending = true;
        if (s.final) finale(g);
        else g.startLevel(s.num + 1);
        return true;
      }
      return false;
    },
    onEnterMap(g, m) {
      g.msg(`Возраст Бени меняется. Память о Сомике: ${g.somMemory}/5 — туман взросления.`, '#8080c0');
    },
    onTurn(g) {
      const m = g.map;
      for (const a of m.actors) {
        if (a.data.boss && a.ai === 'still' && g.dist(a, g.player) <= 6) {
          a.ai = 'melee';
          g.popup(a.name, s.boss.intro, a.color);
        }
        if ((a.data.mini || a.data.boss) && a.data.lines && g.rng.chance(0.08) && g.dist(a, g.player) < 8) g.say(a, g.rng.pick(a.data.lines), 3);
      }
    },
    onKill(g, a) {
      if (a.data.boss) {
        const m = g.map;
        const e = m.flags.exitAt;
        setTile(m, e.x, e.y, 'portal');
        m.props.push({ x: e.x, y: e.y, id: 'next', name: s.final ? 'дверь «Продолжение следует…»' : 'переход на следующий этап жизни' });
        if (s.num <= 4) g.addItem('clock_shard', 1, true);
        g.popup('Победа', `${a.name} повержен!${s.num <= 4 ? ' Найден осколок часов.' : ''} В углу комнаты открылся проход (встань на него и нажми Пробел).`, '#ffd080');
      }
    },
    chordBonus() {
      return 1;
    },
  };
}

function finale(g: Game) {
  const shards = g.inv.get('clock_shard') ?? 0;
  g.pushDialog({
    who: 'Продолжение следует…',
    color: '#ffd080',
    text: `«Тень Времени» рассеивается. Бени стоит в «шалаше из воспоминаний» — старом вагоне, где собралась вся компания: Якут, Энбар, Идо, Амир, Гая, Йонатан. Мама Нина и папа Вова накрывают на стол. Эмили приходит с конфетной заначкой.\n\nИ где-то в речке, которой давно нет, машет хвостом Сомик. Бени помнит его. Навсегда.\n\nОсколков часов: ${shards}/4${shards >= 4 ? ' — из них собирается ключ K-14…' : ''}\n\nДверь впереди открыта.\n\nПРОДОЛЖЕНИЕ СЛЕДУЕТ…`,
    options: [{ label: 'Конец (пока)', act: () => { g.album.memories += 30; g.achieve('finale', 'Продолжение следует…'); g.mode = 'victory'; } }],
  });
}

export { getTile };
