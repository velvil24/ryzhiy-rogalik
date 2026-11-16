// Точка входа: игровой цикл, ввод с клавиатуры и сенсорных кнопок.
import './style.css';
import { Game } from './engine/game';
import { Renderer } from './ui/render';
import { UI } from './ui/ui';
import { Audio } from './audio/audio';
import { ITEMS } from './entities/items';

const game = new Game();
game.hooks = {
  sfx: (id) => Audio.sfx(id),
  music: (id) => Audio.music(id),
  voice: (id) => Audio.voice(id),
  ambience: (id) => Audio.ambience(id),
};
const canvas = document.getElementById('view') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
(window as any).__renderer = renderer;
(window as any).__game = game;
const ui = new UI(game);

function resize() {
  renderer.resize();
  game.dirty = true;
}
window.addEventListener('resize', resize);
resize();


const MOVE: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  Numpad8: [0, -1], Numpad2: [0, 1], Numpad4: [-1, 0], Numpad6: [1, 0],
  Numpad7: [-1, -1], Numpad9: [1, -1], Numpad1: [-1, 1], Numpad3: [1, 1],
  Home: [-1, -1], PageUp: [1, -1], End: [-1, 1], PageDown: [1, 1],
  y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
};

function handle(key: string, code: string, shift: boolean) {
  const g = game;
  Audio.music(g.mode === 'title' || !g.mapId ? 'menu' : g.mode === 'dead' ? 'death' : g.currentMusic());
  if (key === 'o' || key === 'O' || key === 'щ') {
    const on = Audio.toggle();
    g.msg(on ? 'Звук включён.' : 'Звук выключен.', '#a0a0a0');
    return;
  }
  const k = key.length === 1 ? key.toLowerCase() : key;
  switch (g.mode) {
    case 'title':
      if (k === 'Enter' || k === ' ') g.newRun();
      else if (k === 'a' || k === 'ф') g.mode = 'album';
      else if (k === '?' || k === 'h') g.mode = 'help';
      return;
    case 'album':
      if (k === 'Escape' || k === 'Enter') g.mode = 'title';
      else if (/^[1-9]$/.test(k)) ui.buyUnlock(+k - 1);
      return;
    case 'help':
      if (k === 'Escape' || k === 'Enter' || k === '?') g.mode = g.mapId && !g.flags.deathCause ? 'play' : 'title';
      return;
    case 'intro':
      if (k === 'Enter' || k === ' ' || k === 'Escape') g.mode = 'play';
      return;
    case 'dead':
      if (k === 'Enter') {
        g.flags.deathCause = undefined;
        g.mode = 'title';
      } else if (k === 'a') g.mode = 'album';
      return;
    case 'victory':
      if (k === 'Enter') g.mode = 'title';
      return;
    case 'dialog':
      if (/^[1-9]$/.test(k)) g.chooseDialog(+k - 1);
      else if ((k === 'Enter' || k === ' ' || k === 'Escape') && g.dialogs[0]?.options.length === 1) g.chooseDialog(0);
      else if (k === 'Escape') {
        const last = g.dialogs[0]?.options.length;
        if (last) g.chooseDialog(last - 1);
      }
      return;
    case 'perk':
      if (/^[1-3]$/.test(k) && g.perkChoices[+k - 1]) {
        g.givePerk(g.perkChoices[+k - 1]);
        g.perkChoices = [];
        g.mode = g.dialogs.length ? 'dialog' : 'play';
      }
      return;
    case 'inventory': {
      if (k === 'Escape' || k === 'i') {
        g.mode = 'play';
        return;
      }
      const i = 'abcdefghijklmnopqrstuvwxyz'.indexOf(k);
      const id = [...g.inv.keys()][i];
      if (id) {
        g.mode = 'play';
        const took = g.useItem(id);
        g.doTurn(took);
      }
      return;
    }
    case 'chords': {
      if (k === 'Escape' || k === 'g') {
        g.mode = 'play';
        return;
      }
      const map: Record<string, string> = { e: 'E', a: 'A', g: 'G', p: 'P', '1': 'E', '2': 'A', '3': 'G', '4': 'P' };
      const c = map[k];
      if (c && g.chordsKnown().includes(c)) {
        g.mode = 'play';
        g.doTurn(g.playChord(c));
      }
      return;
    }
    case 'map':
      if (k === 'Escape' || k === 'm' || k === 'Enter') g.mode = 'play';
      return;
    case 'quests':
      g.mode = 'play';
      return;
    case 'play':
      break;
  }
  // ── игровой режим
  const mv = MOVE[key] ?? MOVE[code] ?? (key.length === 1 ? MOVE[key.toLowerCase()] : undefined);
  if (mv) {
    if (shift) {
      const d = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]].findIndex(([x, y]) => x === mv[0] && y === mv[1]);
      g.facing = d;
      g.dirty = true;
      return;
    }
    g.doTurn(g.playerMove(mv[0], mv[1]));
    return;
  }
  switch (k) {
    case ' ':
    case 'Enter':
      g.doTurn(g.interact());
      break;
    case '>':
    case '.':
      if (g.map.tiles[g.player.y * g.map.w + g.player.x] === 'pipe') g.doTurn(g.interact());
      else g.doTurn(true); // ждать ход
      break;
    case '5':
    case 'z':
    case 'Numpad5':
      g.doTurn(true);
      break;
    case 'g':
    case 'п':
      if (!g.hasItem('guitar')) g.msg('Гитары пока нет — она висит дома без струн.', '#a0a0a0');
      else g.mode = 'chords';
      break;
    case 'i':
    case 'ш':
      g.mode = 'inventory';
      break;
    case 't':
    case 'е':
      g.doTurn(g.throwRock());
      break;
    case 'j':
    case 'о':
      g.doTurn(g.jump());
      break;
    case 'l':
    case 'д':
      g.doTurn(g.look());
      break;
    case 'r':
    case 'к': {
      const s = g.map.signs.find((q) => g.dist(q, g.player) <= 1);
      if (s) g.readSign(s);
      else g.msg('Рядом нет надписей.', '#a0a0a0');
      break;
    }
    case 'm':
    case 'ь':
      g.mode = 'map';
      break;
    case 'q':
    case 'й':
      g.mode = 'quests';
      break;
    case '?':
    case 'h':
      g.mode = 'help';
      break;
    case 'Tab':
      g.ascii = !g.ascii;
      g.msg(g.ascii ? 'Режим чистого ASCII.' : 'Тайловый режим.', '#a0a0a0');
      break;
  }
  g.dirty = true;
}

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (['Tab', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) e.preventDefault();
  handle(e.key, e.code, e.shiftKey);
  ui.update();
});

// клики по кнопкам в окнах
document.getElementById('modal')!.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button[data-k]') as HTMLElement | null;
  if (!b) return;
  handle(b.dataset.k!, '', false);
  ui.update();
});

// сенсорные кнопки
document.getElementById('touch')!.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button[data-k]') as HTMLElement | null;
  if (!b) return;
  handle(b.dataset.k!, b.dataset.code ?? '', b.dataset.shift === '1');
  ui.update();
});

// клик по карте — шаг в сторону клика
canvas.addEventListener('click', (e) => {
  if (game.mode !== 'play') return;
  const r = canvas.getBoundingClientRect();
  const tx = Math.floor((e.clientX - r.left) / renderer.S + renderer.camX);
  const ty = Math.floor((e.clientY - r.top) / renderer.S + renderer.camY);
  const dx = Math.sign(tx - game.player.x), dy = Math.sign(ty - game.player.y);
  if (dx || dy) game.doTurn(game.playerMove(dx, dy));
  else game.doTurn(game.interact());
  ui.update();
});

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  for (const f of game.fx) f.ttl -= dt * 30;
  game.fx = game.fx.filter((f) => f.ttl > 0);
  if (game.mode !== 'title' && game.map) renderer.draw(game, dt);
  else {
    const ctx = renderer.ctx;
    const r = canvas.getBoundingClientRect();
    ctx.fillStyle = '#120a06';
    ctx.fillRect(0, 0, r.width, r.height);
  }
  if (game.dirty) {
    game.dirty = false;
    ui.update();
  }
  requestAnimationFrame(frame);
}
ui.update();
requestAnimationFrame(frame);

// для отладки из консоли
(window as any).__items = ITEMS;
