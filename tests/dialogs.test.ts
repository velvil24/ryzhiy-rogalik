// Все диалоги и реквизит Уровня 1 открываются, и любой вариант ответа выполняется без ошибок.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game';
import { emptyAlbum } from '../src/engine/save';

function fresh(seed = 5) {
  const g = new Game(seed, emptyAlbum());
  g.newRun(seed);
  g.mode = 'play';
  // богатый инвентарь, чтобы открылись все ветки
  for (const it of ['wrench', 'bamba', 'bamba', 'mammoth', 'card', 'watermelon', 'pebble', 'guitar', 'branches', 'cardboard', 'blanket', 'rope']) g.addItem(it, 1, true);
  return g;
}

describe('диалоги Уровня 1', () => {
  it('каждый вариант каждого диалога выполняется', () => {
    const base = fresh();
    const maps = ['yard', 'forest', 'river', 'base', 'school', 'dim_som', 'dim_frost', 'dim_rock', 'dim_sky'];
    let count = 0;
    for (const mid of maps) {
      const kinds = base.maps[mid].actors.filter((a) => a.tags.has('npc') || ['fan', 'jet', 'som'].includes(a.kind)).map((a) => a.kind);
      for (const kind of new Set(kinds)) {
        for (let opt = 0; opt < 6; opt++) {
          const g = fresh();
          g.flags.loveStarted = true;
          g.flags.windowQuest = opt % 2 ? 'broken' : undefined;
          g.flags.greatStarted = opt > 2;
          g.enterMap(mid, g.maps[mid].start.x, g.maps[mid].start.y);
          const a = g.map.actors.find((x) => x.kind === kind)!;
          for (let rep = 0; rep < 3; rep++) {
            const d = g.levelMod.talk(g, a);
            if (!d) break;
            g.pushDialog(d);
            let guard = 0;
            while (g.dialogs.length && guard++ < 10) {
              const n = g.dialogs[0].options.length;
              g.chooseDialog(Math.min(opt, n - 1));
              count++;
            }
            g.mode = 'play';
          }
        }
      }
    }
    expect(count).toBeGreaterThan(50);
  });

  it('весь реквизит отзывается', () => {
    for (const mid of ['yard', 'forest', 'river', 'base', 'school', 'dim_cats', 'dim_rock', 'dim_rogue']) {
      const g = fresh(6);
      g.enterMap(mid, g.maps[mid].start.x, g.maps[mid].start.y);
      for (const p of [...g.map.props]) {
        g.mode = 'play';
        g.levelMod.prop(g, p);
        let guard = 0;
        while (g.dialogs.length && guard++ < 10) g.chooseDialog(0);
      }
    }
  });
});
