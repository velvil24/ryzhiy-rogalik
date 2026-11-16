// Шаблоны существ: враги, NPC, коты, боссы.
import type { Actor, AiKind, Faction } from '../engine/types';

export interface ActorTpl {
  name: string;
  ch: string;
  color: string;
  hp: number;
  atk: number;
  def?: number;
  speed?: number;
  faction: Faction;
  ai: AiKind;
  xp?: number;
  tags?: string[];
  data?: Record<string, any>;
}

export const TPL: Record<string, ActorTpl> = {
  // ── враги Уровня 1
  dog: { name: 'Злая собака', ch: 'd', color: '#c08040', hp: 6, atk: 2, faction: 'enemy', ai: 'dog', xp: 4, tags: ['loud'] },
  mosquito: { name: 'Комар-мутант', ch: 'm', color: '#d0d060', hp: 2, atk: 1, speed: 1.5, faction: 'enemy', ai: 'melee', xp: 1 },
  crow: { name: 'Злая ворона', ch: 'v', color: '#404060', hp: 4, atk: 1, speed: 1.5, faction: 'enemy', ai: 'crow', xp: 3 },
  scorpion: { name: 'Летний скорпион', ch: 's', color: '#e0a040', hp: 5, atk: 3, faction: 'enemy', ai: 'melee', xp: 5, tags: ['poison'] },
  jackal: { name: 'Шакал', ch: 'j', color: '#c0a070', hp: 7, atk: 3, faction: 'enemy', ai: 'melee', xp: 6, tags: ['night'] },
  guard: { name: 'Школьный охранник', ch: 'G', color: '#4060c0', hp: 14, atk: 2, faction: 'enemy', ai: 'patrol', xp: 8, data: { sayLine: 'Стоять! Ты почему не на уроке?' } },
  soldier: { name: 'Патруль базы', ch: 'P', color: '#708050', hp: 20, atk: 4, faction: 'enemy', ai: 'patrol', xp: 10, data: { catches: true, sayLine: 'Эй! Сюда нельзя!' } },
  train_shadow: { name: 'Тень поезда', ch: 'Ж', color: '#6040a0', hp: 8, atk: 4, faction: 'enemy', ai: 'melee', xp: 8 },
  shadow: { name: 'Тень страха', ch: '?', color: '#503070', hp: 6, atk: 2, faction: 'enemy', ai: 'shadow', xp: 5 },
  wasp: { name: 'Осиный рой', ch: 'w', color: '#ffd020', hp: 3, atk: 1, speed: 2, faction: 'enemy', ai: 'melee', xp: 2 },
  // мини-босс
  french1: { name: 'Француз Жюль', ch: 'F', color: '#4080ff', hp: 16, atk: 3, faction: 'enemy', ai: 'french', xp: 25, tags: ['boss', 'french'], data: { lines: ['Allez!', 'Petit!', 'Ха-ха, petit Бени!'] } },
  french2: { name: 'Француз Люка', ch: 'F', color: '#ff4060', hp: 16, atk: 3, faction: 'enemy', ai: 'french', xp: 25, tags: ['boss', 'french'], data: { lines: ['Allez!', 'Petit!', 'Oh là là!'] } },
  // босс
  train_boss: { name: '«Железный Грохот»', ch: 'Ш', color: '#a080ff', hp: 60, atk: 6, faction: 'enemy', ai: 'boss_train', xp: 150, tags: ['boss', 'chordOnly'] },
  // ── котики
  cat: { name: 'Кот', ch: 'c', color: '#d0d0d0', hp: 5, atk: 2, speed: 2, faction: 'neutral', ai: 'cat', tags: ['cat'] },
  cat_orange: { name: 'Рыжий кот', ch: 'c', color: '#ff8c1a', hp: 8, atk: 3, speed: 2, faction: 'neutral', ai: 'cat', tags: ['cat', 'ginger'] },
  cat_king: { name: 'Рыжий Король', ch: 'C', color: '#ff7000', hp: 30, atk: 6, speed: 2, faction: 'neutral', ai: 'cat', tags: ['cat', 'ginger', 'king'] },
  cat_strange: { name: 'Странный кот', ch: 'c', color: '#40c0ff', hp: 5, atk: 2, speed: 2, faction: 'neutral', ai: 'cat', tags: ['cat', 'strange'] },
  // ── семья и друзья
  nina: { name: 'Мама Нина', ch: 'N', color: '#ff90b0', hp: 99, atk: 0, faction: 'neutral', ai: 'still', tags: ['npc', 'family'] },
  vova: { name: 'Папа Вова', ch: 'V', color: '#80b0ff', hp: 99, atk: 5, faction: 'neutral', ai: 'still', tags: ['npc', 'family'] },
  emily: { name: 'Эмили', ch: 'e', color: '#ffa0ff', hp: 99, atk: 0, faction: 'neutral', ai: 'npc', tags: ['npc', 'family'] },
  enbar: { name: 'Энбар', ch: 'E', color: '#707080', hp: 20, atk: 3, faction: 'neutral', ai: 'npc', tags: ['npc', 'friend'] },
  ido: { name: 'Идо', ch: 'I', color: '#60c0a0', hp: 20, atk: 3, faction: 'neutral', ai: 'npc', tags: ['npc', 'friend'] },
  amir: { name: 'Амир', ch: 'A', color: '#ffc060', hp: 30, atk: 3, def: 1, faction: 'neutral', ai: 'npc', tags: ['npc', 'friend'] },
  gaya: { name: 'Гая', ch: 'g', color: '#80e060', hp: 18, atk: 3, faction: 'neutral', ai: 'npc', tags: ['npc', 'friend'] },
  yonatan: { name: 'Йонатан', ch: 'Y', color: '#f0f040', hp: 20, atk: 3, speed: 1.5, faction: 'neutral', ai: 'npc', tags: ['npc', 'friend'] },
  yakut: { name: 'Якут', ch: 'K', color: '#ff5050', hp: 26, atk: 4, faction: 'neutral', ai: 'npc', tags: ['npc', 'friend'] },
  iit: { name: 'Иит', ch: 'i', color: '#a0d0ff', hp: 16, atk: 2, faction: 'neutral', ai: 'npc', tags: ['npc'] },
  mila: { name: 'Мила', ch: 'l', color: '#ffc0e0', hp: 16, atk: 1, faction: 'neutral', ai: 'npc', tags: ['npc'] },
  neighbor: { name: 'Ворчливый сосед', ch: 'S', color: '#b0a080', hp: 99, atk: 0, faction: 'neutral', ai: 'still', tags: ['npc'] },
  teacher: { name: 'Учительница музыки', ch: 'T', color: '#e0a0ff', hp: 99, atk: 0, faction: 'neutral', ai: 'still', tags: ['npc'] },
  settler: { name: 'Призрак первого поселенца', ch: '@', color: '#c0e0ff', hp: 99, atk: 0, faction: 'neutral', ai: 'still', tags: ['npc', 'ghost'] },
  som: { name: 'Сомик', ch: 'Ѕ', color: '#60a0a0', hp: 40, atk: 0, speed: 0.5, faction: 'neutral', ai: 'som', tags: ['npc', 'som'] },
  elder: { name: 'Старший парень', ch: 'B', color: '#a06060', hp: 12, atk: 3, faction: 'enemy', ai: 'melee', xp: 7 },
  mammoth_ice: { name: 'Мамонт во льду', ch: 'M', color: '#c0e0ff', hp: 99, atk: 0, faction: 'neutral', ai: 'still', tags: ['npc'] },
  fan: { name: 'Фанат', ch: 'f', color: '#ff80ff', hp: 6, atk: 0, faction: 'neutral', ai: 'wander', tags: [] },
  jet: { name: 'Реактивный самолёт', ch: '✈', color: '#e0e0ff', hp: 99, atk: 0, faction: 'neutral', ai: 'wander', tags: [] },
  rogue_kobold: { name: 'k', ch: 'k', color: '#ffffff', hp: 4, atk: 2, faction: 'enemy', ai: 'melee', xp: 3 },
  stub_mini: { name: 'Мини-босс', ch: 'B', color: '#ff6060', hp: 24, atk: 4, faction: 'enemy', ai: 'melee', xp: 40, tags: ['boss'] },
  stub_boss: { name: 'Босс', ch: 'Ш', color: '#ff2060', hp: 50, atk: 6, faction: 'enemy', ai: 'melee', xp: 120, tags: ['boss'] },
};

let nextId = 1;
export function resetIds() {
  nextId = 1;
}

export function makeActor(kind: string, x: number, y: number, over: Partial<Actor> = {}): Actor {
  const t = TPL[kind];
  if (!t) throw new Error('Нет шаблона ' + kind);
  const a: Actor = {
    id: nextId++, kind, name: t.name, ch: t.ch, color: t.color, x, y,
    hp: t.hp, maxHp: t.hp, atk: t.atk, def: t.def ?? 0, speed: t.speed ?? 1, energy: 0,
    faction: t.faction, ai: t.ai, xp: t.xp ?? 0, stun: 0, laugh: 0, pets: 0,
    tags: new Set(t.tags ?? []), data: { ...(t.data ?? {}) },
  };
  return Object.assign(a, over);
}
