// Аудиосистема. Файлы описаны в manifest.json (те же имена, что генерирует ElevenLabs).
// Если файла ещё нет, вместо него звучит короткая синтезированная заглушка,
// поэтому игра работает и без сгенерированного звука.
import { Howl, Howler } from 'howler';
import manifest from './manifest.json';

interface Entry { id: string; type: 'music' | 'sfx' | 'voice'; file: string }

const entries = new Map<string, Entry>((manifest.items as Entry[]).map((e) => [e.id, e]));
const cache = new Map<string, Howl | null>();
let musicId: string | null = null;
let music: Howl | null = null;
let ambience: Howl | null = null;
let ctx: AudioContext | null = null;
let enabled = true;
let musicVol = 0.45;
let sfxVol = 0.8;

const isBrowser = typeof window !== 'undefined';

function load(id: string, loop = false): Howl | null {
  if (!isBrowser) return null;
  if (cache.has(id)) return cache.get(id)!;
  const e = entries.get(id);
  if (!e) {
    cache.set(id, null);
    return null;
  }
  const h = new Howl({ src: [e.file], loop, html5: e.type === 'music', preload: true });
  h.once('loaderror', () => cache.set(id, null));
  cache.set(id, h);
  return h;
}

// ── синтезированные заглушки
const STUB: Record<string, number[]> = {
  pickup: [880, 1320], hit_stick: [180], hurt: [140, 100], throw_rock: [300, 200], glass_break: [1800, 2400, 1400],
  chord_e: [82, 123, 165], chord_a: [110, 165, 220, 277], chord_g: [98, 147, 196, 247], chord_power: [82, 123],
  solo: [659, 784, 880, 988, 1175, 1319], cat_meow: [700, 900, 600], cat_purr: [60, 62], cat_bark: [400, 300],
  cat_quack: [500, 350], king_meow: [300, 420, 260], pipe_down: [800, 600, 400, 200], burrow_reveal: [1200, 1600],
  secret_found: [660, 880, 1320], level_up: [523, 659, 784, 1046], death: [330, 262, 196], jet_flyby: [90, 70, 60],
  ghost_horn: [110, 104], train_approach: [60, 55], train_break: [200, 900], step: [], school_bell: [1400, 1400, 1400],
  dog_bark: [250, 200], jackal: [500, 700, 600], bees: [220, 230], som_splash: [200, 300, 500], jump_roof: [300, 600, 150],
  eat_mammoth: [200, 400, 800], build_shalash: [200, 220, 240], fishing: [600, 300], amir_laugh: [300, 350, 300, 350],
  stall_door: [120], slip: [900, 500], door: [220, 180], faucet: [],
};

function beep(freqs: number[], dur = 0.09) {
  if (!isBrowser || !freqs.length) return;
  try {
    ctx = ctx ?? new AudioContext();
    let t = ctx.currentTime;
    for (const f of freqs) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = f < 150 ? 'sawtooth' : 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.06 * sfxVol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.6);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur * 1.7);
      t += dur;
    }
  } catch {
    /* звук недоступен */
  }
}

export const Audio = {
  sfx(id: string) {
    if (!enabled) return;
    const h = load(id);
    if (h && h.state() !== 'unloaded') {
      h.volume(sfxVol);
      h.play();
      // если файл не загрузится, сыграем заглушку
      h.once('loaderror', () => beep(STUB[id] ?? [440]));
    } else beep(STUB[id] ?? [440]);
  },
  voice(id: string) {
    if (!enabled) return;
    const h = load(id);
    if (h) {
      h.volume(1);
      h.play();
    }
  },
  music(id: string) {
    if (musicId === id) return;
    musicId = id;
    music?.fade(music.volume(), 0, 600);
    const old = music;
    setTimeout(() => old?.stop(), 650);
    if (!enabled) return;
    const h = load(id, true);
    music = h;
    if (h) {
      h.loop(true);
      h.volume(0);
      h.play();
      h.fade(0, musicVol, 800);
    }
  },
  ambience(id: string | undefined) {
    ambience?.stop();
    ambience = null;
    if (!enabled || !id) return;
    const h = load(id, true);
    if (h) {
      h.loop(true);
      h.volume(0.25);
      h.play();
      ambience = h;
    }
  },
  toggle() {
    enabled = !enabled;
    Howler.mute(!enabled);
    return enabled;
  },
  get enabled() {
    return enabled;
  },
  has(id: string) {
    return entries.has(id);
  },
  ids() {
    return [...entries.keys()];
  },
};
