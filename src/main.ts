// Точка входа: игровой цикл, ввод с клавиатуры и сенсорных кнопок.
import './style.css';
import { Game } from './engine/game';
import { Renderer } from './ui/render';
import { UI } from './ui/ui';
import { Audio } from './audio/audio';
import { ITEMS } from './entities/items';
import { listProfiles, onAccountsChange } from './shared/accounts';
import { loadAlbum } from './engine/save';

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

// На телефоне клавиш нет: включаем нужную музыку и по касанию/клику (браузер разрешает звук только после жеста)
const syncMusic = () => Audio.music(game.mode === 'title' || !game.mapId ? 'menu' : game.mode === 'dead' ? 'death' : game.currentMusic());
window.addEventListener('pointerdown', syncMusic, { capture: true });

// ── сенсорный режим (телефоны и планшеты)
const root = document.documentElement;
const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || window.innerWidth < 700;
function applyTouch() {
  root.classList.toggle('touch', isTouch());
}
applyTouch();

function resize() {
  applyTouch();
  // ждём перестройки вёрстки (поворот экрана, выход из полноэкранного режима)
  requestAnimationFrame(() => {
    renderer.resize();
    game.dirty = true;
  });
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

// ── полноэкранный режим
const fsEl = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
const fsSupported = () => !!(fsEl.requestFullscreen || fsEl.webkitRequestFullscreen);
const isFs = () => !!(document.fullscreenElement || doc.webkitFullscreenElement) || root.classList.contains('immersive');
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      await (document.exitFullscreen ? document.exitFullscreen() : doc.webkitExitFullscreen?.());
    } else if (root.classList.contains('immersive')) {
      root.classList.remove('immersive');
    } else if (fsSupported()) {
      await (fsEl.requestFullscreen ? fsEl.requestFullscreen({ navigationUI: 'hide' }) : fsEl.webkitRequestFullscreen!());
      try {
        await (screen.orientation as any)?.lock?.('any');
      } catch {
        /* блокировка ориентации есть не везде */
      }
    } else {
      // iPhone: Fullscreen API нет — прячем всё лишнее и подсказываем «На экран Домой»
      root.classList.add('immersive');
      game.msg('На iPhone настоящий полный экран: «Поделиться» → «На экран Домой», и запускайте игру с иконки.', '#ffd060');
    }
  } catch {
    root.classList.toggle('immersive');
  }
  updateFsBtn();
  resize();
}
const fsBtn = document.getElementById('fsbtn')!;
function updateFsBtn() {
  fsBtn.textContent = isFs() ? '🗗' : '⛶';
  fsBtn.title = isFs() ? 'Выйти из полного экрана (F)' : 'Во весь экран (F)';
}
fsBtn.addEventListener('click', () => toggleFullscreen());
document.addEventListener('fullscreenchange', () => { updateFsBtn(); resize(); });
document.addEventListener('webkitfullscreenchange', () => { updateFsBtn(); resize(); });
// запущено с иконки на «Домой» — уже во весь экран
if (matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) fsBtn.style.display = 'none';

// ── панель состояния на телефоне
document.getElementById('infobtn')!.addEventListener('click', () => root.classList.toggle('show-side'));
document.getElementById('side')!.addEventListener('click', () => root.classList.remove('show-side'));


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
  if ((k === 'f' || k === 'а') && g.mode !== 'dialog' && g.mode !== 'inventory') {
    toggleFullscreen();
    return;
  }
  if (k === 'Escape' && root.classList.contains('show-side')) {
    root.classList.remove('show-side');
    return;
  }
  switch (g.mode) {
    case 'profiles': {
      const st = ui.prof;
      if (k === 'Escape') {
        if (st.view !== 'list') ui.profileAction('list');
        else g.mode = 'title';
      } else if (st.view === 'list' && (k === 'n' || k === 'т')) ui.profileAction('new');
      else if (st.view === 'list' && /^[1-9]$/.test(k)) {
        const p = listProfiles()[+k - 1];
        if (p) ui.profileAction('pick:' + p.id);
      }
      return;
    }
    case 'title':
      if (k === 'p' || k === 'з') {
        ui.prof = { ...ui.prof, view: 'list', msg: undefined, confirmDel: undefined };
        g.mode = 'profiles';
      } else if (k === 'Enter' || k === ' ') g.newRun();
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
  // ввод текста (имя игрока, код переноса)
  const tg = e.target as HTMLElement;
  if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) {
    if (e.key === 'Enter' && tg.id === 'pname') {
      e.preventDefault();
      ui.profileAction('save');
    } else if (e.key === 'Escape') ui.profileAction('list');
    return;
  }
  if (['Tab', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) e.preventDefault();
  handle(e.key, e.code, e.shiftKey);
  ui.update();
});

// клики по кнопкам в окнах
document.getElementById('modal')!.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest('button[data-act]') as HTMLElement | null;
  if (a) {
    ui.profileAction(a.dataset.act!);
    ui.update();
    return;
  }
  const b = (e.target as HTMLElement).closest('button[data-k]') as HTMLElement | null;
  if (!b) return;
  handle(b.dataset.k!, '', false);
  ui.update();
});

// сенсорные кнопки: срабатывают сразу при касании, стрелки повторяются при удержании
const REPEAT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']);
let holdTimer = 0;
let heldBtn: HTMLElement | null = null;
function stopHold() {
  clearTimeout(holdTimer);
  heldBtn?.classList.remove('held');
  heldBtn = null;
}
function press(b: HTMLElement) {
  if (navigator.vibrate) navigator.vibrate(8);
  handle(b.dataset.k!, b.dataset.code ?? '', b.dataset.shift === '1');
  ui.update();
}
const touchBar = document.getElementById('touch')!;
touchBar.addEventListener('pointerdown', (e) => {
  const b = (e.target as HTMLElement).closest('button[data-k]') as HTMLElement | null;
  if (!b) return;
  e.preventDefault();
  stopHold();
  heldBtn = b;
  b.classList.add('held');
  // окно открыто — стрелки работают как обычные клавиши (без повтора)
  press(b);
  if (REPEAT.has(b.dataset.k!)) {
    const again = () => {
      if (heldBtn !== b || game.mode !== 'play') return stopHold();
      press(b);
      holdTimer = window.setTimeout(again, 150);
    };
    holdTimer = window.setTimeout(again, 380);
  }
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) touchBar.addEventListener(ev, stopHold);
touchBar.addEventListener('contextmenu', (e) => e.preventDefault());

// свайп по карте — шаг в 8 направлениях (каждые ~40 px протяжки — ещё шаг)
let swipe: { x: number; y: number; moved: boolean } | null = null;
let suppressClick = false;
canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) return;
  swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY, moved: false };
}, { passive: true });
canvas.addEventListener('touchmove', (e) => {
  if (!swipe || game.mode !== 'play') return;
  e.preventDefault();
  const t = e.touches[0];
  const dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
  if (Math.hypot(dx, dy) < 40) return;
  const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  const DIR8: Record<number, [number, number]> = { 0: [1, 0], 1: [1, 1], 2: [0, 1], 3: [-1, 1], 4: [-1, 0], '-4': [-1, 0], '-3': [-1, -1], '-2': [0, -1], '-1': [1, -1] };
  const [mx, my] = DIR8[a];
  game.doTurn(game.playerMove(mx, my));
  ui.update();
  swipe = { x: t.clientX, y: t.clientY, moved: true };
}, { passive: false });
canvas.addEventListener('touchend', () => {
  if (swipe?.moved) suppressClick = true;
  swipe = null;
});

// клик по карте — шаг в сторону клика
canvas.addEventListener('click', (e) => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  root.classList.remove('show-side');
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
// игрок сменился в другой вкладке или в другой игре на этом сайте
onAccountsChange(() => {
  if (game.mode === 'title' || game.mode === 'album' || game.mode === 'profiles') {
    game.album = loadAlbum();
    ui.lastModalHtml = '';
    ui.update();
  }
});
ui.update();
requestAnimationFrame(frame);

// для отладки из консоли
(window as any).__items = ITEMS;
