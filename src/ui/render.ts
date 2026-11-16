// Отрисовка карты на Canvas: тайлы 16×16 (процедурный пиксель-арт с анимацией воды, листвы, свечением и частицами)
// или режим чистого ASCII (Tab).
import type { Game } from '../engine/game';
import { TILES, type TileId } from '../engine/tiles';
import { type GameMap, getTile, idx, DIRS8 } from '../engine/types';
import { HAIR, SPRITES, spriteFor } from './sprites';

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }

function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * k)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * k)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * k)));
  return `rgb(${r},${g},${b})`;
}

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  S = 32; // размер клетки на экране
  cols = 30;
  rows = 20;
  camX = 0;
  camY = 0;
  particles: Particle[] = [];
  time = 0;
  tileCache = new Map<string, HTMLCanvasElement>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(r.width * dpr);
    this.canvas.height = Math.floor(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    // клетка: на телефоне мельче, чтобы было видно ~16+ клеток по короткой стороне
    const short = Math.min(r.width, r.height);
    this.S = short < 420 ? 22 : short < 560 ? 24 : r.width < 700 ? 24 : 32;
    this.cols = Math.ceil(r.width / this.S);
    this.rows = Math.ceil(r.height / this.S);
    this.tileCache.clear();
  }

  // ───────────────────────── статичные тайлы (с кэшем)
  private staticTile(t: TileId, v: number): HTMLCanvasElement {
    const key = t + v + this.S;
    let c = this.tileCache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = this.S;
    const g = c.getContext('2d')!;
    this.paintTile(g, t, v, 0);
    this.tileCache.set(key, c);
    return c;
  }

  private px(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
    const p = this.S / 16;
    g.fillStyle = color;
    g.fillRect(Math.round(x * p), Math.round(y * p), Math.ceil(w * p), Math.ceil(h * p));
  }

  private paintTile(g: CanvasRenderingContext2D, t: TileId, v: number, time: number) {
    const d = TILES[t];
    const P = (x: number, y: number, w: number, h: number, c: string) => this.px(g, x, y, w, h, c);
    P(0, 0, 16, 16, d.bg);
    const r = (i: number) => hash(v * 31 + i, i * 7 + v);
    switch (t) {
      case 'grass':
      case 'snow':
        for (let i = 0; i < 6; i++) P(Math.floor(r(i) * 15), Math.floor(r(i + 9) * 14), 1, 2, shade(d.fg, 0.8 + r(i + 3) * 0.4));
        break;
      case 'dirt':
      case 'sand':
      case 'hill':
        for (let i = 0; i < 5; i++) P(Math.floor(r(i) * 15), Math.floor(r(i + 9) * 15), 1, 1, shade(d.fg, 0.7 + r(i + 3) * 0.5));
        if (t === 'hill') P(2, 6, 12, 2, shade(d.fg, 0.8));
        break;
      case 'floor':
      case 'wood':
        for (let y = 0; y < 16; y += 4) P(0, y, 16, 1, shade(d.bg, 0.8));
        P(Math.floor(r(1) * 12), 1, 1, 3, shade(d.bg, 0.75));
        break;
      case 'tile':
      case 'wet':
        P(0, 0, 16, 1, shade(d.bg, 0.8));
        P(0, 8, 16, 1, shade(d.bg, 0.8));
        P(0, 0, 1, 16, shade(d.bg, 0.8));
        P(8, 0, 1, 16, shade(d.bg, 0.8));
        if (t === 'wet') P(3, 10, 6, 2, '#8ad0f0');
        break;
      case 'asphalt':
        for (let i = 0; i < 4; i++) P(Math.floor(r(i) * 15), Math.floor(r(i + 9) * 15), 1, 1, '#555');
        if (v % 5 === 0) P(6, 7, 4, 1, '#c0b040');
        break;
      case 'wall':
      case 'fwall':
        for (let y = 0; y < 16; y += 4) {
          P(0, y, 16, 1, shade(d.bg, 0.8));
          const off = (y / 4) % 2 ? 4 : 0;
          for (let x = off; x < 16; x += 8) P(x, y, 1, 4, shade(d.bg, 0.8));
        }
        P(0, 0, 16, 2, '#f0e6d0');
        break;
      case 'fence':
        P(0, 6, 16, 2, '#8a6a40');
        P(0, 11, 16, 2, '#8a6a40');
        for (let x = 1; x < 16; x += 5) P(x, 3, 2, 12, '#a0804a');
        for (let i = 0; i < 4; i++) P(Math.floor(r(i) * 14), Math.floor(r(i + 4) * 6), 2, 2, '#ff6ab8');
        break;
      case 'rail':
        for (let y = 1; y < 16; y += 4) P(0, y, 16, 2, '#6a4a30');
        P(3, 0, 2, 16, '#b0b0b8');
        P(11, 0, 2, 16, '#b0b0b8');
        break;
      case 'door':
        P(3, 1, 10, 15, '#8a5a2a');
        P(4, 2, 8, 13, '#a06a30');
        P(10, 8, 1, 2, '#ffd060');
        break;
      case 'window':
      case 'broken':
        P(0, 0, 16, 16, '#9a8a72');
        P(2, 3, 12, 10, t === 'window' ? '#80c8f0' : '#303030');
        P(7, 3, 2, 10, '#9a8a72');
        if (t === 'broken') {
          P(3, 4, 3, 1, '#a0e0ff');
          P(10, 9, 2, 2, '#a0e0ff');
        } else P(3, 4, 2, 2, '#e0f8ff');
        break;
      case 'bed':
        P(1, 4, 14, 10, '#6a4a2a');
        P(2, 5, 12, 8, '#e06060');
        P(2, 5, 4, 3, '#f0f0f0');
        break;
      case 'table':
      case 'desk':
        P(1, 5, 14, 4, d.fg);
        P(2, 9, 2, 6, shade(d.fg, 0.7));
        P(12, 9, 2, 6, shade(d.fg, 0.7));
        break;
      case 'poster':
        P(0, 0, 16, 16, '#9a8a72');
        P(2, 1, 12, 14, '#202020');
        P(3, 2, 10, 4, '#ff3030');
        P(5, 8, 6, 5, '#ffd040');
        break;
      case 'sign':
        P(7, 8, 2, 8, '#6a4a2a');
        P(1, 2, 14, 7, '#e8d080');
        P(2, 4, 12, 1, '#4a3a20');
        P(3, 6, 9, 1, '#4a3a20');
        break;
      case 'stall':
        P(1, 0, 14, 16, '#8090a0');
        P(2, 1, 12, 14, '#90a0b0');
        P(11, 8, 1, 2, '#303030');
        break;
      case 'sink':
        P(3, 6, 10, 6, '#e0f0ff');
        P(5, 7, 6, 3, '#a0c0d0');
        P(7, 3, 2, 3, '#c0c0c0');
        break;
      case 'wire':
        for (let x = 0; x < 16; x += 3) P(x, 4 + (x % 2), 2, 1, '#c0c0c0');
        for (let x = 0; x < 16; x += 3) P(x, 10 + (x % 2), 2, 1, '#c0c0c0');
        P(2, 2, 1, 13, '#808080');
        P(13, 2, 1, 13, '#808080');
        break;
      case 'tower':
        P(3, 1, 10, 5, '#c0c0a0');
        P(4, 6, 2, 10, '#808070');
        P(10, 6, 2, 10, '#808070');
        P(5, 2, 6, 2, '#303030');
        break;
      case 'hole':
        P(2, 3, 12, 10, '#1a120a');
        P(3, 4, 10, 8, '#000');
        break;
      case 'mattress':
        P(1, 4, 14, 9, '#e0d0f0');
        for (let x = 3; x < 14; x += 4) P(x, 6, 1, 5, '#b0a0c0');
        break;
      case 'roof':
        for (let y = 0; y < 16; y += 3) P(0, y, 16, 2, y % 2 ? '#c04a2a' : '#e05a3a');
        break;
      case 'site':
        P(5, 8, 6, 3, '#6a4a20');
        P(4, 10, 8, 1, '#8a6a30');
        break;
      case 'car':
        P(0, 5, 16, 7, '#4080c0');
        P(3, 2, 10, 4, '#60a0e0');
        P(2, 11, 3, 3, '#202020');
        P(11, 11, 3, 3, '#202020');
        break;
      case 'bin':
        P(3, 3, 10, 12, '#4a7a4a');
        P(2, 2, 12, 2, '#5a8a5a');
        break;
      case 'piano':
        P(1, 3, 14, 11, '#181818');
        for (let x = 2; x < 14; x += 2) P(x, 9, 1, 4, '#f0f0f0');
        break;
      case 'locker':
        P(1, 0, 6, 16, '#5080c0');
        P(9, 0, 6, 16, '#5080c0');
        P(2, 3, 4, 1, '#304060');
        P(10, 3, 4, 1, '#304060');
        break;
      case 'chalk':
        P(0, 0, 16, 16, '#9a8a72');
        P(1, 2, 14, 10, '#20402a');
        P(3, 5, 5, 1, '#e0e0e0');
        P(4, 8, 7, 1, '#e0e0e0');
        break;
      case 'amp':
        P(1, 1, 14, 14, '#202020');
        P(3, 3, 10, 10, '#404040');
        P(5, 5, 6, 6, '#101010');
        break;
      case 'throne':
        P(3, 1, 10, 14, '#ffb020');
        P(5, 6, 6, 6, '#c03030');
        break;
      case 'ice':
        P(0, 0, 16, 16, '#6090b0');
        P(2, 2, 5, 1, '#e0f8ff');
        P(9, 9, 4, 1, '#e0f8ff');
        break;
      case 'cloud':
        P(0, 0, 16, 16, '#7ab0e0');
        P(1, 5, 14, 8, '#f0f8ff');
        P(4, 3, 8, 3, '#ffffff');
        break;
      case 'stage':
        P(0, 0, 16, 16, '#2a1030');
        break;
      case 'void':
        P(0, 0, 16, 16, '#000');
        break;
      default:
        break;
    }
  }

  /** Анимированные тайлы рисуются каждый кадр. */
  private animTile(g: CanvasRenderingContext2D, t: TileId, sx: number, sy: number, x: number, y: number) {
    const S = this.S;
    const p = S / 16;
    const d = TILES[t];
    const tm = this.time;
    if (t === 'water' || t === 'deep') {
      g.fillStyle = d.bg;
      g.fillRect(sx, sy, S, S);
      for (let i = 0; i < 3; i++) {
        const ph = Math.sin(tm * 2 + x * 0.9 + y * 1.7 + i * 2.1);
        g.fillStyle = shade(d.fg, 0.8 + ph * 0.2);
        g.fillRect(sx + Math.round((2 + i * 5 + ph * 1.5) * p), sy + Math.round((3 + i * 4) * p), Math.round(4 * p), Math.max(1, Math.round(p)));
      }
      if (hash(x, y) > 0.92 && Math.sin(tm * 3 + x) > 0.95) {
        g.fillStyle = '#ffffff';
        g.fillRect(sx + 6 * p, sy + 6 * p, p, p);
      }
      return;
    }
    if (t === 'euc' || t === 'pine' || t === 'orange' || t === 'reeds') {
      g.fillStyle = d.bg;
      g.fillRect(sx, sy, S, S);
      const sway = Math.sin(tm * 1.5 + x * 0.7 + y * 0.3) * p * 0.8;
      if (t === 'reeds') {
        g.fillStyle = d.fg;
        for (let i = 0; i < 4; i++) g.fillRect(sx + (2 + i * 4) * p + sway * (i % 2 ? 1 : -1), sy + 2 * p, p, 13 * p);
        g.fillStyle = '#8a6030';
        for (let i = 0; i < 4; i++) g.fillRect(sx + (2 + i * 4) * p + sway, sy + 2 * p, p, 3 * p);
        return;
      }
      g.fillStyle = t === 'pine' ? '#5a3a20' : '#c0b0a0';
      g.fillRect(sx + 7 * p, sy + 9 * p, 2 * p, 7 * p);
      if (t === 'pine') {
        g.fillStyle = d.fg;
        g.beginPath();
        g.moveTo(sx + 8 * p + sway, sy + 1 * p);
        g.lineTo(sx + 14 * p + sway, sy + 12 * p);
        g.lineTo(sx + 2 * p + sway, sy + 12 * p);
        g.fill();
      } else {
        g.fillStyle = shade(d.bg, 1.6);
        g.beginPath();
        g.arc(sx + 8 * p + sway, sy + 6.5 * p, 6.5 * p, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = t === 'orange' ? '#4a8a3a' : d.fg;
        g.beginPath();
        g.arc(sx + 7 * p + sway, sy + 5.5 * p, 4.5 * p, 0, Math.PI * 2);
        g.fill();
        if (t === 'orange') {
          g.fillStyle = '#ffa630';
          g.fillRect(sx + 4 * p + sway, sy + 6 * p, 2 * p, 2 * p);
          g.fillRect(sx + 10 * p + sway, sy + 4 * p, 2 * p, 2 * p);
          g.fillRect(sx + 8 * p + sway, sy + 9 * p, 2 * p, 2 * p);
        }
      }
      return;
    }
    if (t === 'bush' || t === 'flower') {
      g.drawImage(this.staticTile(t === 'bush' ? 'grass' : 'grass', (x * 7 + y) % 8), sx, sy);
      const sway = Math.sin(tm * 2 + x + y) * p * 0.5;
      if (t === 'bush') {
        g.fillStyle = '#3f8f3a';
        g.beginPath();
        g.arc(sx + 8 * p + sway, sy + 10 * p, 6 * p, Math.PI, 0);
        g.fill();
        g.fillStyle = d.fg;
        g.beginPath();
        g.arc(sx + 6 * p + sway, sy + 9 * p, 3 * p, 0, Math.PI * 2);
        g.fill();
      } else {
        g.fillStyle = '#ff6ab8';
        for (let i = 0; i < 4; i++) g.fillRect(sx + (3 + (i * 3.3) % 10) * p + sway, sy + (4 + ((i * 5) % 8)) * p, 2 * p, 2 * p);
      }
      return;
    }
    // светящиеся
    g.fillStyle = d.bg;
    g.fillRect(sx, sy, S, S);
    const glow = 0.6 + Math.sin(tm * 3 + x + y) * 0.4;
    if (t === 'stove') {
      g.fillStyle = '#505050';
      g.fillRect(sx + 2 * p, sy + 3 * p, 12 * p, 11 * p);
      g.fillStyle = `rgba(255,${100 + glow * 80},40,${glow})`;
      g.fillRect(sx + 4 * p, sy + 5 * p, 3 * p, 2 * p);
      g.fillRect(sx + 9 * p, sy + 5 * p, 3 * p, 2 * p);
    } else if (t === 'pipe') {
      g.fillStyle = '#2f9f3f';
      g.fillRect(sx + 2 * p, sy + 3 * p, 12 * p, 4 * p);
      g.fillStyle = '#3fbf4f';
      g.fillRect(sx + 3 * p, sy + 7 * p, 10 * p, 9 * p);
      g.fillStyle = '#103010';
      g.fillRect(sx + 4 * p, sy + 4 * p, 8 * p, 2 * p);
    } else if (t === 'portal') {
      const r = (5 + glow * 2) * p;
      const gr = g.createRadialGradient(sx + S / 2, sy + S / 2, 1, sx + S / 2, sy + S / 2, r);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.4, '#e080ff');
      gr.addColorStop(1, 'rgba(80,0,120,0)');
      g.fillStyle = gr;
      g.fillRect(sx, sy, S, S);
      g.fillStyle = '#301040';
      g.fillRect(sx + 7 * p, sy + 6 * p, 2 * p, 3 * p);
    } else if (t === 'exit') {
      g.fillStyle = `rgba(255,255,200,${0.25 + glow * 0.25})`;
      g.fillRect(sx + 2 * p, sy + 2 * p, 12 * p, 12 * p);
      g.fillStyle = '#ffffff';
      g.fillRect(sx + 6 * p, sy + 5 * p, 2 * p, 6 * p);
      g.fillRect(sx + 8 * p, sy + 7 * p, 2 * p, 2 * p);
    } else if (t === 'shalash') {
      g.fillStyle = '#8a6030';
      g.beginPath();
      g.moveTo(sx + 8 * p, sy + 1 * p);
      g.lineTo(sx + 15 * p, sy + 14 * p);
      g.lineTo(sx + 1 * p, sy + 14 * p);
      g.fill();
      g.fillStyle = `rgba(255,160,40,${glow})`;
      g.fillRect(sx + 7 * p, sy + 10 * p, 2 * p, 4 * p);
    } else if (t === 'stage') {
      g.fillStyle = `hsla(${(tm * 60 + x * 20) % 360},80%,50%,0.35)`;
      g.fillRect(sx, sy, S, S);
    }
  }

  private isAnim(t: TileId) {
    return !!TILES[t].anim || t === 'bush' || t === 'flower' || t === 'stage';
  }

  // ───────────────────────── кадр
  draw(game: Game, dt: number) {
    this.time += dt;
    const ctx = this.ctx;
    const m = game.map;
    if (!m) return;
    const S = this.S;
    const r = this.canvas.getBoundingClientRect();
    const W = r.width, H = r.height;
    // камера
    const p = game.player;
    const targetX = Math.max(0, Math.min(m.w - this.cols + 1, p.x - Math.floor(this.cols / 2)));
    const targetY = Math.max(0, Math.min(m.h - this.rows + 1, p.y - Math.floor(this.rows / 2)));
    this.camX += (targetX - this.camX) * Math.min(1, dt * 12);
    this.camY += (targetY - this.camY) * Math.min(1, dt * 12);
    if (m.w <= this.cols) this.camX = -(this.cols - m.w) / 2;
    if (m.h <= this.rows) this.camY = -(this.rows - m.h) / 2;
    let shakeX = 0, shakeY = 0;
    for (const f of game.fx) if (f.kind === 'shake') {
      shakeX += (Math.random() - 0.5) * 6 * (f.ttl / f.max);
      shakeY += (Math.random() - 0.5) * 6 * (f.ttl / f.max);
    }
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.translate(shakeX, shakeY);
    const filter = m.palette === 'mono' || game.ascii && false ? 'grayscale(1) contrast(1.2)' : m.palette === 'pink' ? 'saturate(1.4) hue-rotate(-12deg)' : m.palette === 'cold' ? 'saturate(0.85) hue-rotate(12deg) brightness(1.05)' : 'none';
    ctx.filter = filter;
    const x0 = Math.floor(this.camX), y0 = Math.floor(this.camY);
    const ox = (this.camX - x0) * S, oy = (this.camY - y0) * S;
    const night = m.light === 'outdoor' ? game.timeOfDay() : 'день';
    const vr = game.visRadius;

    for (let j = -1; j <= this.rows + 1; j++) {
      for (let i = -1; i <= this.cols + 1; i++) {
        const x = x0 + i, y = y0 + j;
        if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
        const k = idx(m, x, y);
        if (!m.explored[k]) continue;
        const sx = i * S - ox, sy = j * S - oy;
        const t = getTile(m, x, y);
        const vis = m.visible[k] === 1;
        if (game.ascii) {
          const d = TILES[t];
          ctx.fillStyle = '#000';
          ctx.fillRect(sx, sy, S, S);
          ctx.fillStyle = vis ? d.fg : shade(d.fg, 0.35);
          ctx.font = `${Math.floor(S * 0.8)}px "DejaVu Sans Mono", Menlo, Consolas, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let ch = d.ch;
          if (t === 'fwall') ch = '#';
          ctx.fillText(ch, sx + S / 2, sy + S / 2 + 1);
        } else {
          if (this.isAnim(t) && vis) this.animTile(ctx, t, sx, sy, x, y);
          else ctx.drawImage(this.staticTile(this.isAnim(t) && !TILES[t].anim ? 'grass' : t, Math.floor(hash(x, y) * 8)), sx, sy);
          if (!vis) {
            ctx.fillStyle = 'rgba(8,8,20,0.62)';
            ctx.fillRect(sx, sy, S, S);
          } else if (night !== 'день' || m.light === 'dim') {
            const dd = Math.hypot(x - p.x, y - p.y) / (vr + 1);
            const base = night === 'ночь' || m.light === 'dim' ? 0.55 : 0.25;
            ctx.fillStyle = night === 'закат' ? `rgba(80,20,40,${base * 0.6 + dd * 0.35})` : `rgba(4,8,40,${Math.min(0.85, base + dd * 0.45)})`;
            ctx.fillRect(sx, sy, S, S);
          }
        }
      }
    }
    // мерцание: невидимые входы и норы (подсказка №1)
    for (const s of m.secrets) {
      if (s.revealed) continue;
      if (!(s.kind === 'burrow' || s.kind === 'air')) continue;
      if (!m.visible[idx(m, s.x, s.y)]) continue;
      const strong = s.kind === 'air' && m.flags.airHint;
      if (strong ? Math.sin(this.time * 6) > 0 : hash(Math.floor(this.time * 3), s.x) > 0.93) {
        const sx = (s.x - this.camX) * S, sy = (s.y - this.camY) * S;
        ctx.fillStyle = strong ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.9)';
        ctx.fillRect(sx + S * 0.45, sy + S * 0.4, Math.max(2, S / 10), Math.max(2, S / 10));
      }
    }
    // «глаз» папы
    if (m.flags.eyeMark) {
      const e = m.flags.eyeMark;
      if (m.explored[idx(m, e.x, e.y)]) {
        const sx = (e.x - this.camX) * S, sy = (e.y - this.camY) * S;
        ctx.strokeStyle = '#80b0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(sx + S / 2, sy + S / 2, S * 0.4, S * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#80b0ff';
        ctx.beginPath();
        ctx.arc(sx + S / 2, sy + S / 2, S * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // предметы
    for (const it of m.items) {
      if (!m.visible[idx(m, it.x, it.y)]) continue;
      const sx = (it.x - this.camX) * S, sy = (it.y - this.camY) * S;
      this.drawItem(ctx, it.item, sx, sy, game);
    }
    // существа
    const actors = [...m.actors].sort((a, b) => a.y - b.y);
    for (const a of actors) {
      if (a.dead || a.data.hidden) continue;
      if (!m.visible[idx(m, a.x, a.y)] && a !== p) continue;
      const sx = (a.x - this.camX) * S, sy = (a.y - this.camY) * S;
      this.drawActor(ctx, a, sx, sy, game);
    }
    // направление взгляда
    {
      const [dx, dy] = DIRS8[game.facing];
      const sx = (p.x - this.camX) * S + S / 2, sy = (p.y - this.camY) * S + S / 2;
      ctx.fillStyle = 'rgba(255,220,120,0.85)';
      ctx.beginPath();
      ctx.arc(sx + dx * S * 0.55, sy + dy * S * 0.55, Math.max(2, S * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.filter = 'none';
    this.drawFx(ctx, game, W, H);
    this.drawParticles(ctx, game, dt, W, H, night);
    // реплики
    for (const a of actors) {
      if (!a.say || a.data.hidden || (!m.visible[idx(m, a.x, a.y)] && a !== p)) continue;
      const sx = (a.x - this.camX) * S + S / 2, sy = (a.y - this.camY) * S - 4;
      ctx.font = `bold ${Math.max(11, Math.floor(S * 0.42))}px system-ui, sans-serif`;
      const w = ctx.measureText(a.say).width + 10;
      ctx.fillStyle = 'rgba(255,255,240,0.95)';
      ctx.fillRect(sx - w / 2, sy - 18, w, 18);
      ctx.fillStyle = '#202020';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.say, sx, sy - 9);
    }
    ctx.restore();
  }

  private drawItem(ctx: CanvasRenderingContext2D, id: string, sx: number, sy: number, game: Game) {
    const S = this.S;
    const bob = Math.sin(this.time * 3 + sx) * 1.5;
    if (game.ascii) {
      ctx.fillStyle = '#ffd060';
      ctx.font = `${Math.floor(S * 0.8)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('*', sx + S / 2, sy + S / 2);
      return;
    }
    const color: Record<string, string> = { memory_coin: '#ffe0a0', string: '#e0e0ff', rock: '#b0a090', mammoth: '#c06040' };
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx + S / 2, sy + S * 0.8, S * 0.22, S * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(sx + S / 2, sy + S / 2 + bob, 1, sx + S / 2, sy + S / 2 + bob, S * 0.4);
    g.addColorStop(0, 'rgba(255,240,180,0.5)');
    g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx, sy, S, S);
    ctx.fillStyle = color[id] ?? (id.startsWith('key') ? '#ffd700' : '#ffd060');
    ctx.font = `bold ${Math.floor(S * 0.6)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyph: Record<string, string> = { bamba: '🥜', pita: '🫓', watermelon: '🍉', mammoth: '🥩', cutlet: '🍖', candy: '🍬', rock: '🪨', stick: '🏏', skate: '🛹', guitar: '🎸', flashlight: '🔦', cap: '🧢', cassette: '📼', cassette_album: '📼', string: '§', pick: '◄', patch: '✈', coin_roman: '🪙', memory_coin: '¢', pebble: '•', wrench: '🔧', card: '💌', branches: '🌿', cardboard: '📦', blanket: '🧣', rope: '🪢', mirror: '🔍', binoculars: '🔭', jacket: '🧥', clock_shard: '◔' };
    ctx.fillText(glyph[id] ?? (id.startsWith('key') ? '🗝' : '*'), sx + S / 2, sy + S / 2 + bob);
  }

  private drawActor(ctx: CanvasRenderingContext2D, a: any, sx: number, sy: number, game: Game) {
    const S = this.S;
    if (game.ascii) {
      ctx.fillStyle = '#000';
      ctx.fillRect(sx, sy, S, S);
      ctx.fillStyle = a.color;
      ctx.font = `bold ${Math.floor(S * 0.85)}px "DejaVu Sans Mono", Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.ch, sx + S / 2, sy + S / 2 + 1);
      return;
    }
    const isP = a === game.player;
    const bob = Math.sin(this.time * 4 + a.id) * (a.tags.has('cat') ? 0.8 : 0.5);
    // тень
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(sx + S / 2, sy + S * 0.88, S * 0.32, S * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    // свечение
    if (isP || a.tags.has('ginger') || a.tags.has('boss') || a.kind === 'settler' || a.tags.has('strange')) {
      const col = isP ? (game.invuln > 0 ? 'rgba(255,80,255,0.55)' : 'rgba(255,170,60,0.35)') : a.tags.has('boss') ? 'rgba(160,100,255,0.45)' : 'rgba(255,160,40,0.3)';
      const g = ctx.createRadialGradient(sx + S / 2, sy + S / 2, 1, sx + S / 2, sy + S / 2, S * 0.75);
      g.addColorStop(0, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - S / 2, sy - S / 2, S * 2, S * 2);
    }
    const sp = spriteFor(a.kind, a.tags);
    const big = a.kind === 'train_boss' || a.kind === 'stub_boss';
    if (sp) {
      const pat = SPRITES[sp];
      const scale = big ? 2 : 1;
      const p = (S / 8) * scale;
      const ox = sx + S / 2 - 4 * p, oy = sy + S - 8 * p + bob - (big ? S * 0.2 : 0);
      const hair = HAIR[a.kind] ?? '#3a2010';
      const body = isP ? '#ff8a20' : a.color;
      const cmap: Record<string, string> = {
        H: hair, S: '#f0c8a0', B: body, L: '#304080', C: a.color, E: a.kind === 'train_boss' ? '#ffff80' : '#101010', P: '#ff90a0',
        D: a.color, Y: '#ffc040', F: a.color, W: a.kind === 'jet' ? '#e0e0ff' : '#ffffff', G: a.color, K: a.color, M: '#202020',
      };
      if (a.faction === 'enemy' && sp === 'ghost') cmap.G = 'rgba(80,40,120,0.85)';
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          const c = pat[y][x];
          if (c === '.') continue;
          ctx.fillStyle = cmap[c] ?? a.color;
          ctx.fillRect(Math.floor(ox + x * p), Math.floor(oy + y * p), Math.ceil(p), Math.ceil(p));
        }
      if (isP) {
        // гитара за спиной
        if (game.hasItem('guitar')) {
          ctx.fillStyle = '#8a4a1a';
          ctx.fillRect(ox + 5.5 * p, oy + 3 * p, p, 3 * p);
          ctx.fillStyle = '#c06020';
          ctx.fillRect(ox + 5 * p, oy + 5 * p, 2 * p, 2 * p);
        }
      }
    } else {
      ctx.fillStyle = a.color;
      ctx.font = `bold ${Math.floor(S * 0.8)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.ch, sx + S / 2, sy + S / 2 + bob);
    }
    // полоска здоровья у врагов
    if (a.faction === 'enemy' && a.hp < a.maxHp) {
      ctx.fillStyle = '#300';
      ctx.fillRect(sx + 3, sy + 1, S - 6, 3);
      ctx.fillStyle = '#f44';
      ctx.fillRect(sx + 3, sy + 1, (S - 6) * Math.max(0, a.hp / a.maxHp), 3);
    }
    if (a.faction === 'ally' && !isP) {
      ctx.fillStyle = '#60ff90';
      ctx.fillRect(sx + S / 2 - 2, sy, 4, 3);
    }
    if (a.stun > 0 || a.laugh > 0) {
      ctx.fillStyle = '#ffff80';
      ctx.font = `${Math.floor(S * 0.4)}px sans-serif`;
      ctx.fillText(a.laugh > 0 ? 'ха' : '★', sx + S * 0.8, sy + S * 0.15);
    }
  }

  private drawFx(ctx: CanvasRenderingContext2D, game: Game, W: number, H: number) {
    const S = this.S;
    const tx = (x: number) => (x - this.camX) * S + S / 2;
    const ty = (y: number) => (y - this.camY) * S + S / 2;
    for (const f of game.fx) {
      const k = f.ttl / f.max;
      switch (f.kind) {
        case 'flash':
          ctx.fillStyle = f.color ?? '#fff';
          ctx.globalAlpha = k * 0.35;
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
          break;
        case 'wave':
          ctx.strokeStyle = f.color ?? '#fff';
          ctx.globalAlpha = k;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(tx(f.x!), ty(f.y!), (1 - k) * (f.r ?? 3) * S + 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        case 'laser':
          ctx.strokeStyle = f.color ?? '#f0f';
          ctx.globalAlpha = Math.min(1, k * 1.5);
          ctx.lineWidth = 3 + Math.sin(this.time * 30) * 1.5;
          ctx.beginPath();
          ctx.moveTo(tx(f.x!), ty(f.y!));
          ctx.lineTo(tx(f.x2!), ty(f.y2!));
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        case 'float':
          ctx.fillStyle = f.color ?? '#fff';
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.font = `bold ${Math.floor(S * 0.5)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(f.text ?? '', tx(f.x!), ty(f.y!) - (1 - k) * S);
          ctx.globalAlpha = 1;
          break;
        case 'spark':
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = f.color ?? '#fff';
            ctx.globalAlpha = k;
            ctx.fillRect(tx(f.x!) + Math.cos(this.time * 9 + i) * S * 0.4, ty(f.y!) + Math.sin(this.time * 9 + i) * S * 0.4, 3, 3);
          }
          ctx.globalAlpha = 1;
          break;
        case 'lane':
          ctx.fillStyle = `rgba(255,40,40,${0.25 + Math.sin(this.time * 20) * 0.15})`;
          ctx.fillRect(0, ty(f.y!) - S / 2, W, S);
          break;
        case 'train': {
          ctx.fillStyle = 'rgba(160,120,255,0.85)';
          if (f.y !== undefined) {
            const x = W * (1 - k) * 1.4 - W * 0.4;
            ctx.fillRect(x, ty(f.y) - S / 2, W * 0.5, S);
            ctx.fillStyle = '#ffffa0';
            ctx.fillRect(x + W * 0.5 - 6, ty(f.y) - 4, 6, 8);
          } else if (f.x !== undefined) {
            const y = H * (1 - k) * 1.4 - H * 0.4;
            ctx.fillStyle = '#6a5a8a';
            ctx.fillRect(tx(f.x) - S / 2, y, S * 2, H * 0.6);
            ctx.fillStyle = '#ffffa0';
            ctx.fillRect(tx(f.x), y + H * 0.6 - 6, 8, 6);
          }
          break;
        }
        case 'jet': {
          const x = W * (1 - k) * 1.3 - W * 0.15;
          const y = H * 0.12;
          ctx.fillStyle = 'rgba(230,230,255,0.95)';
          ctx.beginPath();
          ctx.moveTo(x + 40, y);
          ctx.lineTo(x - 10, y - 8);
          ctx.lineTo(x - 30, y - 22);
          ctx.lineTo(x - 22, y);
          ctx.lineTo(x - 30, y + 22);
          ctx.lineTo(x - 10, y + 8);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x - 30, y);
          ctx.lineTo(x - 300, y);
          ctx.stroke();
          break;
        }
      }
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, game: Game, dt: number, W: number, H: number, night: string) {
    const m = game.map;
    // светлячки ночью, пыль днём, искры в измерениях
    const want = m.light === 'outdoor' ? (night === 'ночь' ? 30 : 12) : m.isDimension ? 20 : 6;
    while (this.particles.length < want) {
      const isNight = night === 'ночь' && m.light === 'outdoor';
      this.particles.push({
        x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 8 - (isNight ? 0 : 3),
        life: 2 + Math.random() * 4,
        color: isNight ? '#e0ff60' : m.isDimension ? '#e0a0ff' : m.palette === 'cold' ? '#ffffff' : 'rgba(255,240,200,0.6)',
        size: isNight ? 2.5 : 1.5,
      });
    }
    for (const q of this.particles) {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      const a = Math.max(0, Math.min(1, q.life)) * (0.5 + Math.sin(this.time * 5 + q.x) * 0.5);
      ctx.globalAlpha = a;
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x, q.y, q.size, q.size);
    }
    ctx.globalAlpha = 1;
    this.particles = this.particles.filter((q) => q.life > 0);
  }

  /** Обзорная карта (M). */
  drawOverview(target: HTMLCanvasElement, game: Game) {
    const m: GameMap = game.map;
    const cs = Math.max(3, Math.floor(Math.min(target.width / m.w, target.height / m.h)));
    const g = target.getContext('2d')!;
    g.fillStyle = '#000';
    g.fillRect(0, 0, target.width, target.height);
    const ox = (target.width - cs * m.w) / 2, oy = (target.height - cs * m.h) / 2;
    for (let y = 0; y < m.h; y++)
      for (let x = 0; x < m.w; x++) {
        if (!m.explored[idx(m, x, y)]) continue;
        const d = TILES[getTile(m, x, y)];
        g.fillStyle = d.walk ? d.bg : d.fg;
        g.fillRect(ox + x * cs, oy + y * cs, cs, cs);
      }
    for (const e of m.exits) {
      g.fillStyle = '#fff';
      g.fillRect(ox + e.x * cs, oy + e.y * cs, cs, cs);
    }
    if (m.flags.eyeMark) {
      g.fillStyle = '#80b0ff';
      g.fillRect(ox + m.flags.eyeMark.x * cs - 1, oy + m.flags.eyeMark.y * cs - 1, cs + 2, cs + 2);
    }
    g.fillStyle = '#ff8a20';
    g.fillRect(ox + game.player.x * cs - 1, oy + game.player.y * cs - 1, cs + 2, cs + 2);
  }
}
