// Интерфейс: боковая панель, журнал, модальные окна (диалоги, инвентарь, аккорды, перки, Альбом, квесты, смерть).
import type { Game } from '../engine/game';
import { ITEMS } from '../entities/items';
import { PERKS } from '../systems/perks';
import { UNLOCKS, saveAlbum } from '../engine/save';
import { level1 } from '../levels/level1';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
const nl = (s: string) => esc(s).replace(/\n/g, '<br>');

function bar(v: number, max: number, color: string, label: string) {
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  return `<div class="bar"><div class="fill" style="width:${pct}%;background:${color}"></div><span>${label}</span></div>`;
}

export const CHORD_INFO: Record<string, { name: string; cost: number; desc: string }> = {
  E: { name: 'E (Ми)', cost: 2, desc: 'Звуковая волна, отбрасывает врагов; вскрывает ложные стены рядом' },
  A: { name: 'A (Ля)', cost: 3, desc: 'Лечит Бени и союзников рядом' },
  G: { name: 'G (Соль)', cost: 3, desc: 'Созывает всех котов этажа; странные коты гавкают/квакают в сторону нор' },
  P: { name: 'Power Chord', cost: 5, desc: 'Огромный урон по прямой (куда смотрит Бени), будит соседей' },
};

export class UI {
  side: HTMLElement;
  log: HTMLElement;
  modal: HTMLElement;
  overview: HTMLCanvasElement;
  hud: HTMLElement;
  lastLogLen = -1;
  invPage: 'items' = 'items';
  albumMsg = '';

  constructor(public game: Game) {
    this.side = document.getElementById('side')!;
    this.log = document.getElementById('log')!;
    this.modal = document.getElementById('modal')!;
    this.overview = document.getElementById('overview') as HTMLCanvasElement;
    this.hud = document.getElementById('hud')!;
  }

  update() {
    const g = this.game;
    if (g.mode === 'title' || g.mode === 'album') {
      this.side.innerHTML = '';
      this.log.innerHTML = '';
      this.hud.innerHTML = '';
    } else {
      this.renderSide();
      this.renderLog();
    }
    this.renderModal();
  }

  renderSide() {
    const g = this.game;
    const p = g.player;
    const s = g.stats;
    const m = g.map;
    const love = s.love;
    const allies = m.actors.filter((a) => a.faction === 'ally' && a !== p);
    const tod = m.light === 'outdoor' ? g.timeOfDay() : m.isDimension ? 'вне времени' : 'в помещении';
    const todIcon = tod === 'день' ? '☀️' : tod === 'закат' ? '🌇' : tod === 'ночь' ? '🌙' : '✨';
    // компактная строка состояния для телефонов и планшетов
    const chip = (t: string, low = false) => `<span class="chip${low ? ' low' : ''}">${t}</span>`;
    this.hud.innerHTML =
      chip(`❤️ ${p.hp}/${p.maxHp}`, p.hp < p.maxHp * 0.3) +
      chip(`🍉 ${s.hunger}`, s.hunger < 25) +
      (g.hasItem('guitar') ? chip(`🎸 ${s.drive}/${s.maxDrive}`) : '') +
      (m.tiles[p.y * m.w + p.x] === 'deep' ? chip(`🫧 ${g.breath}`, g.breath < 4) : '') +
      chip(`${todIcon} ${g.turn}`) +
      chip(esc(m.name));
    this.side.innerHTML = `
      <div class="title">Бени <small>ур. ${s.lvl} · Уровень ${g.level}</small></div>
      <div class="loc">${esc(m.name)}${m.he ? `<div class="he" dir="rtl">${esc(m.he)}</div>` : ''}</div>
      <div class="tod">${todIcon} ${tod} · ход ${g.turn}</div>
      ${bar(p.hp, p.maxHp, p.hp < p.maxHp * 0.3 ? '#ff3030' : '#e04050', `❤️ ${p.hp}/${p.maxHp}`)}
      ${bar(s.hunger, 100, '#e0a030', `🍉 Сытость ${s.hunger}`)}
      ${g.hasItem('guitar') ? bar(s.drive, s.maxDrive, '#c050ff', `🎸 Драйв ${s.drive}/${s.maxDrive}`) : ''}
      ${bar(s.xp, g.xpNext(), '#60c0ff', `⭐ Опыт ${s.xp}/${g.xpNext()}`)}
      ${m.tiles[p.y * m.w + p.x] === 'deep' ? bar(g.breath, g.maxBreath(), '#40a0ff', `🫧 Воздух ${g.breath}`) : ''}
      <div class="stats">
        <span title="Урон в рукопашной, лазанье">💪 ${s.str}</span>
        <span title="Прыжки">🦘 ${s.jump}</span>
        <span title="Сила аккордов">🎸 ${s.rock}</span>
        <span title="Диалоги, блеф">😏 ${s.nagl}</span>
        ${p.def ? `<span title="Защита">🛡 ${p.def}</span>` : ''}
        ${s.style ? `<span title="Стиль">😎 ${s.style}</span>` : ''}
      </div>
      <div class="love" title="Кого больше любят — Бени или Эмили">
        <span>Бени</span><div class="lovebar"><div class="mark" style="left:${100 - love}%"></div></div><span>Эмили</span>
      </div>
      <div class="small">💛 Любовь: ${love >= 38 && love <= 62 ? 'в равновесии' : love > 62 ? 'любимчик — Бени' : 'любимица — Эмили'}</div>
      ${g.somMemory ? `<div class="small">🐟 Память о Сомике: ${'●'.repeat(g.somMemory)}${'○'.repeat(5 - g.somMemory)}</div>` : ''}
      <div class="small">🗝 Связка: ${[...g.inv.keys()].filter((k) => ITEMS[k].kind === 'key').map((k) => `<span style="color:${ITEMS[k].color}">${esc(ITEMS[k].name.replace('Ключ ', ''))}</span>`).join(', ') || '—'}</div>
      <div class="small">✦ Секретов: ${g.secretsFound.size} · ¢ Воспоминаний: ${g.album.memories}</div>
      ${g.weapon ? `<div class="small">В руках: ${esc(ITEMS[g.weapon].name)}</div>` : ''}
      ${allies.length ? `<div class="small">Рядом: ${allies.map((a) => `<span style="color:${a.color}">${esc(a.name)}</span>`).join(', ')}</div>` : ''}
      ${g.invuln ? `<div class="small" style="color:#ff60ff">✨ Неуязвимость: ${g.invuln}</div>` : ''}
      ${g.perks.size ? `<div class="small">Перки: ${[...g.perks].map((k) => esc(PERKS[k].name)).join(', ')}</div>` : ''}
      <div class="keys">
        <b>Стрелки/WASD/цифры</b> ходить · <b>Shift+стрелка</b> повернуться ·
        <b>Пробел</b> действие · <b>G</b> гитара · <b>L</b> присмотреться · <b>J</b> прыжок · <b>T</b> бросить камень ·
        <b>R</b> читать · <b>&gt;</b> в трубу · <b>I</b> вещи · <b>Q</b> квесты · <b>M</b> карта · <b>Tab</b> ASCII · <b>?</b> помощь
      </div>`;
  }

  renderLog() {
    const g = this.game;
    const lines = g.log.slice(-7);
    this.log.innerHTML = lines.map((l, i) => `<div style="color:${l.color};opacity:${0.45 + (i / lines.length) * 0.55}">${esc(l.text)}</div>`).join('');
  }

  renderModal(): void {
    const g = this.game;
    const show = (html: string, cls = '') => {
      this.modal.className = 'modal open ' + cls;
      const closable = ['inv', 'chords', 'quests', 'map', 'help', 'album'].includes(cls);
      this.modal.innerHTML = `<div class="box">${closable ? '<button class="x" data-k="Escape" title="Закрыть">✕</button>' : ''}${html}</div>`;
    };
    this.overview.style.display = 'none';
    switch (g.mode) {
      case 'play':
        this.modal.className = 'modal';
        this.modal.innerHTML = '';
        return;
      case 'title': {
        const a = g.album;
        show(`
          <h1>Рыжий Рогалик</h1>
          <div class="sub">Roguelike-сага о мальчике, который прыгал выше крыш</div>
          <div class="cat">🐈</div>
          <div class="opts">
            <button data-k="Enter">▶ Новый забег <kbd>Enter</kbd></button>
            <button data-k="a">📖 Альбом воспоминаний <kbd>A</kbd> · ¢ ${a.memories}</button>
            <button data-k="?">❔ Как играть <kbd>?</kbd></button>
          </div>
          <div class="small">Забегов: ${a.runs} · Смертей: ${a.deaths} · Лучший уровень: ${a.bestLevel} · Секретов: ${a.secretsFound.length}/${a.totalSecrets}</div>
          <div class="small dim">Звук: ${'<kbd>O</kbd> вкл/выкл'} · Сделано по сценарию «Рыжий Рогалик»</div>`, 'title');
        return;
      }
      case 'intro': {
        const L = g.levelMod;
        show(`<h2>Уровень ${L.num}. ${esc(L.name)}</h2><div class="sub">${esc(L.stage)}</div>${L.intro.map((t) => `<p>${nl(t)}</p>`).join('')}<div class="opts"><button data-k="Enter">Начать <kbd>Enter</kbd></button></div>`, 'intro');
        return;
      }
      case 'dialog': {
        const d = g.dialogs[0];
        if (!d) {
          g.mode = 'play';
          return this.renderModal();
        }
        const f = d.foreign;
        show(`
          <div class="who" style="color:${d.color ?? '#fff'}">${esc(d.who)}</div>
          ${f ? `<div class="foreign"><div class="orig" dir="${f.rtl ? 'rtl' : 'ltr'}">${esc(f.orig)}</div><div class="tr">${esc(f.tr)}</div><div class="ru">${esc(f.ru)}</div></div>` : ''}
          ${d.text ? `<div class="text">${nl(d.text)}</div>` : ''}
          <div class="opts">${d.options.map((o, i) => `<button data-k="${i + 1}"><kbd>${i + 1}</kbd> ${esc(o.label)}</button>`).join('')}</div>`, 'dialog');
        return;
      }
      case 'inventory': {
        const entries = [...g.inv.entries()];
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        show(`<h2>Вещи Бени <small>${g.invCount()}/${g.invLimit()}</small></h2>
          <div class="inv">${entries.map(([id, n], i) => {
            const d = ITEMS[id];
            return `<button data-k="${letters[i]}"><kbd>${letters[i]}</kbd> <span style="color:${d.color}">${esc(d.name)}</span>${n > 1 ? ' ×' + n : ''}${g.weapon === id ? ' <i>(в руках)</i>' : ''}${g.worn.has(id) ? ' <i>(надето)</i>' : ''}<div class="desc">${esc(d.desc)}</div></button>`;
          }).join('') || '<p>Пусто.</p>'}</div>
          <div class="small">Буква — использовать / взять в руки. <kbd>Esc</kbd> — закрыть.</div>`, 'inv');
        return;
      }
      case 'chords': {
        const known = g.chordsKnown();
        show(`<h2>🎸 Аккорды <small>Драйв ${g.stats.drive}/${g.stats.maxDrive}</small></h2>
          <div class="opts">${known.map((c) => `<button data-k="${c.toLowerCase()}"><kbd>${c}</kbd> ${CHORD_INFO[c].name} — ${CHORD_INFO[c].cost} драйва<div class="desc">${CHORD_INFO[c].desc}</div></button>`).join('')}</div>
          <div class="small">Секретная комбинация… E, A, G, E? Последние аккорды: ${g.chordSeq.join('-') || '—'}</div>`, 'chords');
        return;
      }
      case 'quests':
        show(this.questsHtml(), 'quests');
        return;
      case 'perk':
        show(`<h2>Новый уровень! Выбери перк</h2><div class="opts">${g.perkChoices.map((p, i) => `<button data-k="${i + 1}"><kbd>${i + 1}</kbd> <b>${esc(PERKS[p].name)}</b><div class="desc">${esc(PERKS[p].desc)}</div></button>`).join('')}</div>`, 'perk');
        return;
      case 'map':
        show(`<h2>${esc(g.map.name)}</h2><div class="small">Белое — переходы, синий глаз — папина подсказка. <kbd>M</kbd>/<kbd>Esc</kbd> — закрыть</div>`, 'map');
        this.overview.style.display = 'block';
        this.overview.width = Math.min(window.innerWidth - 40, 900);
        this.overview.height = Math.min(window.innerHeight - 160, 560);
        (window as any).__renderer?.drawOverview(this.overview, g);
        return;
      case 'help':
        show(`<h2>Как играть</h2>
          <p>Бени — мальчик с гитарой. Пять уровней — пять этапов его жизни. Погиб — начинаешь заново, но «Воспоминания» копятся в Альбоме и дают постоянные бонусы.</p>
          <ul>
            <li><b>Ходить:</b> стрелки, WASD, цифры (7/9/1/3 — по диагонали). Врезаться во врага — ударить; в друга — поговорить; в кота — погладить (3 раза — и он ваш).</li>
            <li><b>Пробел/Enter</b> — действие: поговорить, взять, починить, порыбачить, отдохнуть в шалаше.</li>
            <li><b>Shift+стрелка</b> — повернуться без шага. <b>L</b> — «Присмотреться» (2 хода): на правильной точке и под правильным углом проявляется кроличья нора; у воды — работает «Отражение».</li>
            <li><b>J</b> — прыжок через препятствия (с крыши — дальше). <b>T</b> — бросить камень туда, куда смотришь.</li>
            <li><b>G</b> — гитара: аккорды E, A, G и Power Chord тратят Драйв. Есть секретная комбинация…</li>
            <li><b>&gt;</b> — пролезть в трубу. Некоторые ямы не смертельны. Ложные стены простукивают палкой или аккордом E.</li>
            <li><b>R</b> — прочитать вывеску на иврите: оригинал, транслитерация, перевод.</li>
            <li><b>I</b> — вещи, <b>Q</b> — квесты, <b>M</b> — карта, <b>Tab</b> — ASCII, <b>O</b> — звук, <b>Esc</b> — закрыть окно.</li>
            <li>Следи за сытостью 🍉, не стой на рельсах, когда гудит поезд, и не попадайся патрулям на базе.</li>
          </ul>
          <div class="opts"><button data-k="Escape">Понятно <kbd>Esc</kbd></button></div>`, 'help');
        return;
      case 'album': {
        const a = g.album;
        show(`<h2>📖 Альбом воспоминаний <small>¢ ${a.memories}</small></h2>
          ${this.albumMsg ? `<div class="flash">${esc(this.albumMsg)}</div>` : ''}
          <div class="opts">${UNLOCKS.map((u, i) => `<button data-k="${i + 1}" ${a.unlocks[u.id] ? 'class="owned"' : ''}><kbd>${i + 1}</kbd> ${esc(u.name)} — ${a.unlocks[u.id] ? 'есть' : u.cost + ' ¢'}<div class="desc">${esc(u.desc)}</div></button>`).join('')}</div>
          ${a.kingFollows ? '<p>👑 Рыжий Король начинает каждый забег с Бени.</p>' : ''}
          <div class="cols">
            <div><h3>Страницы</h3>${a.pages.slice(0, 8).map((p) => `<div class="page">📷 ${esc(p.date)} — ${esc(p.text)}</div>`).join('') || '<p class="dim">Пока пусто.</p>'}</div>
            <div><h3>Достижения</h3>${a.achievements.map((x) => `<div>★ ${esc(x)}</div>`).join('') || '<p class="dim">Пока нет.</p>'}
            <h3>Секреты: ${a.secretsFound.length} из ${a.totalSecrets}</h3>
            ${a.burrowNotes.length ? `<h3>Запертые норы</h3>${a.burrowNotes.map((x) => `<div class="small">🕳 ${esc(x)}</div>`).join('')}` : ''}</div>
          </div>
          <div class="opts"><button data-k="Escape">Назад <kbd>Esc</kbd></button></div>`, 'album');
        return;
      }
      case 'dead':
        show(`<h1 class="sepia">Альбом воспоминаний</h1>
          <div class="photo">📷</div>
          <p>Бени ${g.stats.lvl}-го уровня. ${esc(g.map.name)}. Причина: ${esc(g.flags.deathCause ?? '…')}.</p>
          <p>Секретов найдено: ${g.secretsFound.size}. Получено воспоминаний: <b>${g.flags.deathEarned ?? 0}</b> (всего ${g.album.memories}).</p>
          <p class="dim">Тихий гитарный перебор…</p>
          <div class="opts"><button data-k="Enter">Новый забег <kbd>Enter</kbd></button><button data-k="a">Альбом <kbd>A</kbd></button></div>`, 'dead');
        return;
      case 'victory':
        show(`<h1>Продолжение следует…</h1><p>Спасибо, что прошли с Бени весь путь (пока что).</p><p>Воспоминаний: ${g.album.memories}. Секретов: ${g.secretsFound.size}.</p><div class="opts"><button data-k="Enter">В главное меню <kbd>Enter</kbd></button></div>`, 'victory');
        return;
    }
  }

  questsHtml(): string {
    const g = this.game;
    const q = g.level === 1 ? level1.quests(g) : [];
    return `<h2>Квесты</h2>${q.map((x) => `<div class="quest ${x.done ? 'done' : ''}"><b>${esc(x.name)}</b> ${x.done ? '✓' : ''}<div class="desc">${esc(x.state)}</div></div>`).join('') || '<p>Победи босса этого этапа жизни.</p>'}<div class="opts"><button data-k="Escape">Закрыть <kbd>Esc</kbd></button></div>`;
  }

  showQuests() {
    this.modal.className = 'modal open quests';
    this.modal.innerHTML = `<div class="box">${this.questsHtml()}</div>`;
  }

  buyUnlock(i: number) {
    const g = this.game;
    const u = UNLOCKS[i];
    if (!u) return;
    if (g.album.unlocks[u.id]) {
      this.albumMsg = 'Уже открыто.';
      return;
    }
    if (g.album.memories < u.cost) {
      this.albumMsg = `Не хватает воспоминаний (${g.album.memories}/${u.cost}).`;
      return;
    }
    g.album.memories -= u.cost;
    g.album.unlocks[u.id] = true;
    saveAlbum(g.album);
    this.albumMsg = `Открыто: ${u.name}!`;
  }
}
