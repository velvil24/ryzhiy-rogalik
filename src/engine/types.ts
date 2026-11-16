import type { TileId } from './tiles';

export type Faction = 'player' | 'ally' | 'enemy' | 'neutral';
export type Dir = [number, number];

export const DIRS8: Dir[] = [
  [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1],
];
export const DIR_NAMES = ['север', 'северо-восток', 'восток', 'юго-восток', 'юг', 'юго-запад', 'запад', 'северо-запад'];

export type AiKind =
  | 'none' | 'player' | 'melee' | 'wander' | 'cat' | 'companion' | 'patrol' | 'npc' | 'crow' | 'boss_train'
  | 'shadow' | 'french' | 'som' | 'still' | 'dog';

export interface Actor {
  id: number;
  kind: string; // ключ шаблона (например 'cat_orange', 'npc_nina', 'french1')
  name: string;
  ch: string;
  color: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number; // действий за ход Бени (1 = как Бени, 2 = коты, 0.5 = Сомик)
  energy: number;
  faction: Faction;
  ai: AiKind;
  xp: number; // опыт за победу
  stun: number;
  laugh: number;
  pets: number;
  tags: Set<string>;
  data: Record<string, any>;
  say?: string;
  sayTtl?: number;
  dead?: boolean;
}

export interface Sign {
  x: number;
  y: number;
  he: string; // оригинал (иврит/латиница)
  tr: string; // транслитерация
  ru: string; // перевод
  lang?: 'he' | 'en' | 'ru';
  note?: string; // доп. текст (например, история вывески)
}

export interface Exit {
  x: number;
  y: number;
  to: string;
  tx?: number;
  ty?: number;
  label: string;
}

export type SecretKind = 'pipe' | 'hole' | 'false' | 'air' | 'burrow';

export interface Secret {
  id: string;
  kind: SecretKind;
  name: string;
  x: number;
  y: number; // клетка входа
  target: string; // id карты-тайника/измерения
  // для нор: точка взгляда и направление (индекс DIRS8) или отражение в воде
  viewX?: number;
  viewY?: number;
  dir?: number;
  water?: boolean;
  key?: string; // нужный ключ
  revealed: boolean;
  hint?: string;
}

export interface MapItem {
  x: number;
  y: number;
  item: string;
  qty: number;
}

export interface Prop {
  x: number;
  y: number;
  id: string; // ключ взаимодействия, обрабатывается уровнем
  name: string;
}

export type LightMode = 'outdoor' | 'indoor' | 'dim' | 'bright';

export interface GameMap {
  id: string;
  name: string;
  he?: string;
  w: number;
  h: number;
  tiles: TileId[];
  explored: Uint8Array;
  visible: Uint8Array;
  actors: Actor[];
  items: MapItem[];
  signs: Sign[];
  exits: Exit[];
  secrets: Secret[];
  props: Prop[];
  light: LightMode;
  music: string;
  ambience?: string;
  start: { x: number; y: number };
  palette?: 'normal' | 'mono' | 'cold' | 'pink' | 'sepia';
  isDimension?: boolean;
  returnTo?: { map: string; x: number; y: number };
  flags: Record<string, any>;
}

export function idx(m: GameMap, x: number, y: number) {
  return y * m.w + x;
}
export function inBounds(m: GameMap, x: number, y: number) {
  return x >= 0 && y >= 0 && x < m.w && y < m.h;
}
export function getTile(m: GameMap, x: number, y: number): TileId {
  return inBounds(m, x, y) ? m.tiles[idx(m, x, y)] : 'void';
}
export function setTile(m: GameMap, x: number, y: number, t: TileId) {
  if (inBounds(m, x, y)) m.tiles[idx(m, x, y)] = t;
}

export function newMap(id: string, name: string, w: number, h: number, fill: TileId): GameMap {
  return {
    id, name, w, h,
    tiles: new Array(w * h).fill(fill),
    explored: new Uint8Array(w * h),
    visible: new Uint8Array(w * h),
    actors: [], items: [], signs: [], exits: [], secrets: [], props: [],
    light: 'outdoor', music: 'level1_day', start: { x: 1, y: 1 }, flags: {},
  };
}
