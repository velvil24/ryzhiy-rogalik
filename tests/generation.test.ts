// Автотесты генерации: карты проходимы, ключевые NPC, выходы, реквизит и боссы всегда достижимы.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game';
import { emptyAlbum } from '../src/engine/save';
import { flood } from '../src/engine/gen';
import { idx, inBounds, DIRS8 } from '../src/engine/types';
import { TILES } from '../src/engine/tiles';
import { LEVELS } from '../src/levels/registry';

const SEEDS = [1, 2, 3, 42, 777, 2024, 31337, 99991, 123456, 8675309];

function reachableNear(m: any, reach: Uint8Array, x: number, y: number) {
  if (reach[idx(m, x, y)]) return true;
  return DIRS8.some(([dx, dy]) => inBounds(m, x + dx, y + dy) && reach[idx(m, x + dx, y + dy)]);
}

describe('Уровень 1: генерация', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: все ключевые точки достижимы`, () => {
      const g = new Game(seed, emptyAlbum());
      g.newRun(seed);
      const pts = LEVELS[0].keyPoints!(g);
      for (const [mapId, list] of Object.entries(pts)) {
        const m = g.maps[mapId];
        expect(TILES[m.tiles[idx(m, m.start.x, m.start.y)]].walk, `${mapId}: старт проходим`).toBe(true);
        const reach = flood(m, m.start.x, m.start.y);
        for (const p of list) expect(reachableNear(m, reach, p.x, p.y), `${mapId}: ${p.what} (${p.x},${p.y})`).toBe(true);
      }
    });

    it(`seed ${seed}: все переходы ведут на существующие карты, у тайников есть выход`, () => {
      const g = new Game(seed, emptyAlbum());
      g.newRun(seed);
      for (const m of Object.values(g.maps)) {
        for (const e of m.exits) if (!e.to.startsWith('__')) expect(g.maps[e.to], `${m.id} → ${e.to}`).toBeTruthy();
        for (const s of m.secrets) {
          const t = g.maps[s.target];
          expect(t, `секрет ${s.id} → ${s.target}`).toBeTruthy();
          expect(t.exits.some((e) => e.to === '__return'), `из ${t.id} есть выход назад`).toBe(true);
          const reach = flood(t, t.start.x, t.start.y);
          const back = t.exits.find((e) => e.to === '__return')!;
          expect(reachableNear(t, reach, back.x, back.y), `${t.id}: выход назад достижим`).toBe(true);
        }
      }
    });

    it(`seed ${seed}: все 6 нор и их ключи на месте`, () => {
      const g = new Game(seed, emptyAlbum());
      g.newRun(seed);
      const burrows = Object.values(g.maps).flatMap((m) => m.secrets.filter((s) => s.kind === 'burrow'));
      expect(burrows.length).toBe(6);
      for (const b of burrows) {
        if (!b.water) expect(b.viewX, `${b.id}: есть точка взгляда`).toBeDefined();
      }
    });
  }

  it('карта зоны «Дом и двор»: мама, папа, Эмили, гитара, переезд на месте', () => {
    const g = new Game(5, emptyAlbum());
    g.newRun(5);
    const y = g.maps.yard;
    for (const k of ['nina', 'vova', 'emily', 'yakut', 'amir', 'ido', 'yonatan']) expect(y.actors.some((a) => a.kind === k), k).toBe(true);
    for (const p of ['guitar_wall', 'crossing', 'stove', 'car', 'mattress', 'nest']) expect(y.props.some((q) => q.id === p), p).toBe(true);
    expect(y.actors.filter((a) => a.tags.has('ginger')).length).toBe(3);
  });

  it('арена «Железного Грохота» проходима между всеми колеями', () => {
    const g = new Game(5, emptyAlbum());
    g.newRun(5);
    const m = g.maps.boss;
    const reach = flood(m, m.start.x, m.start.y);
    for (const ly of m.flags.lanes) expect(reach[idx(m, 10, ly)]).toBe(1);
    expect(reach[idx(m, 22, 9)]).toBe(1);
  });
});

describe('Уровни 2–5: заготовки', () => {
  for (const seed of SEEDS.slice(0, 5)) {
    for (const n of [2, 3, 4, 5]) {
      it(`уровень ${n}, seed ${seed}: босс, мини-босс, отдых и выход достижимы`, () => {
        const g = new Game(seed, emptyAlbum());
        g.newRun(seed);
        g.startLevel(n);
        const m = g.map;
        const reach = flood(m, m.start.x, m.start.y);
        const boss = m.actors.find((a) => a.data.boss)!;
        const mini = m.actors.find((a) => a.data.mini)!;
        expect(boss).toBeTruthy();
        expect(mini).toBeTruthy();
        expect(reachableNear(m, reach, boss.x, boss.y)).toBe(true);
        expect(reachableNear(m, reach, mini.x, mini.y)).toBe(true);
        expect(reachableNear(m, reach, m.flags.exitAt.x, m.flags.exitAt.y)).toBe(true);
        for (const p of m.props) expect(reachableNear(m, reach, p.x, p.y), p.name).toBe(true);
      });
    }
  }
});
