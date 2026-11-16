// Сценарные проверки: основные механики работают без ошибок.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game';
import { emptyAlbum } from '../src/engine/save';
import { DIRS8 } from '../src/engine/types';

function fresh(seed = 11) {
  const g = new Game(seed, emptyAlbum());
  g.newRun(seed);
  g.mode = 'play';
  return g;
}

describe('механики', () => {
  it('500 случайных ходов не роняют игру', () => {
    for (const seed of [3, 4, 5]) {
      const g = fresh(seed);
      for (let i = 0; i < 500 && g.mode !== 'dead'; i++) {
        if (g.mode === 'dialog') { g.chooseDialog(0); continue; }
        if (g.mode === 'perk') { g.givePerk(g.perkChoices[0]); g.mode = 'play'; continue; }
        g.mode = 'play';
        const r = g.rng.int(0, 9);
        if (r < 7) {
          const [dx, dy] = DIRS8[g.rng.int(0, 7)];
          g.doTurn(g.playerMove(dx, dy));
        } else if (r === 7) g.doTurn(g.look());
        else if (r === 8) g.doTurn(g.jump());
        else g.doTurn(g.interact());
      }
      expect(g.turn).toBeGreaterThan(50);
    }
  });

  it('шесть струн собирают гитару, аккорды работают', () => {
    const g = fresh();
    for (const k of ['str_vova', 'str_enbar', 'str_river', 'str_elder', 'str_emily', 'str_school']) g.flags[k] = true;
    const p = g.map.props.find((q) => q.id === 'guitar_wall')!;
    g.levelMod.prop(g, p);
    expect(g.hasItem('guitar')).toBe(true);
    expect(g.stats.rock).toBe(3);
    expect(g.chordsKnown()).toEqual(['E', 'A']);
    g.mode = 'play';
    g.stats.drive = 10;
    expect(g.playChord('E')).toBe(true);
    expect(g.playChord('A')).toBe(true);
  });

  it('нора проявляется под правильным углом и не пускает без ключа', () => {
    const g = fresh(21);
    g.enterMap('base', 7, 5);
    g.facing = 0;
    g.look();
    const s = g.map.secrets.find((q) => q.id === 'L1_burrow_sky')!;
    expect(s.revealed).toBe(true);
    g.player.x = 7; g.player.y = 3;
    g.playerMove(0, -1);
    expect(g.mapId).toBe('base');
    g.addItem('key_sky', 1, true);
    g.player.x = 7; g.player.y = 3;
    g.playerMove(0, -1);
    expect(g.mapId).toBe('dim_sky');
    // и обратно в ту же точку
    const back = g.map.exits.find((e) => e.to === '__return')!;
    g.player.x = back.x + 1; g.player.y = back.y;
    g.playerMove(-1, 0);
    expect(g.mapId).toBe('base');
  });

  it('труба ведёт в тайник и обратно', () => {
    const g = fresh(8);
    const s = g.map.secrets.find((q) => q.kind === 'pipe')!;
    g.player.x = s.x; g.player.y = s.y;
    g.interact();
    expect(g.mapId).toBe('sec_yardpipe');
    expect(g.secretsFound.has(s.id)).toBe(true);
  });

  it('гладить кота три раза — компаньон', () => {
    const g = fresh(9);
    const c = g.map.actors.find((a) => a.data.catId === 'apelsin')!;
    g.removeItem('bamba', 5);
    for (let i = 0; i < 3; i++) g.petCat(c);
    expect(c.faction).toBe('ally');
    expect(g.flags.gingers).toContain('apelsin');
    expect(g.flags.chordG).toBe(true);
  });

  it('смерть записывается в Альбом', () => {
    const g = fresh(12);
    const before = g.album.deaths;
    g.damage(g.player, 999, null, 'тест');
    expect(g.mode).toBe('dead');
    expect(g.album.deaths).toBe(before + 1);
    expect(g.album.pages.length).toBeGreaterThan(0);
  });

  it('босс Уровня 1 запускается ночью с гитарой и проходит все фазы', () => {
    const g = fresh(13);
    g.addItem('guitar', 1, true);
    g.flags.guitar = true;
    g.turn = 300;
    const cr = g.map.props.find((q) => q.id === 'crossing')!;
    g.levelMod.prop(g, cr);
    g.chooseDialog(0);
    expect(g.mapId).toBe('boss');
    g.invuln = 999;
    g.mode = 'play';
    for (let i = 0; i < 25; i++) g.doTurn(true);
    expect(g.flags.bossState.phase).toBe(2);
    for (const a of g.map.actors.filter((x) => x.kind === 'shadow')) g.kill(a, g.player);
    g.doTurn(true);
    expect(g.flags.bossState.phase).toBe(3);
    const b = g.map.actors.find((a) => a.kind === 'train_boss')!;
    expect(b).toBeTruthy();
    g.dialogs = [];
    g.kill(b, g.player);
    expect(g.flags.bossDone).toBe(true);
    g.chooseDialog(0);
    expect(g.level).toBe(2);
  });

  it('уровни 2→5 и финал «Продолжение следует…»', () => {
    const g = fresh(14);
    for (const n of [2, 3, 4, 5]) {
      g.startLevel(n);
      g.mode = 'play';
      const boss = g.map.actors.find((a) => a.data.boss)!;
      g.kill(boss, g.player);
      g.dialogs = [];
      const next = g.map.props.find((p) => p.id === 'next')!;
      expect(next).toBeTruthy();
      if (n < 5) {
        g.levelMod.prop(g, next);
        expect(g.level).toBe(n + 1);
      } else {
        g.levelMod.prop(g, next);
        g.chooseDialog(0);
        expect(g.mode).toBe('victory');
      }
    }
  });
});
