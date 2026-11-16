// Типы клеток карты. Каждая клетка описывает, как она выглядит в ASCII и в тайловом режиме,
// можно ли по ней ходить и закрывает ли она обзор.

export type TileId =
  | 'grass' | 'dirt' | 'floor' | 'wood' | 'tile' | 'wet' | 'wall' | 'fwall' | 'fence' | 'euc' | 'pine'
  | 'bush' | 'orange' | 'flower' | 'water' | 'deep' | 'reeds' | 'sand' | 'asphalt' | 'rail'
  | 'door' | 'window' | 'broken' | 'bed' | 'table' | 'stove' | 'poster' | 'sign' | 'stall' | 'sink'
  | 'wire' | 'tower' | 'pipe' | 'hole' | 'mattress' | 'roof' | 'shalash' | 'site' | 'portal'
  | 'exit' | 'void' | 'snow' | 'ice' | 'cloud' | 'stage' | 'amp' | 'throne' | 'car' | 'desk'
  | 'piano' | 'bin' | 'hill' | 'locker' | 'chalk';

export interface TileDef {
  ch: string;
  fg: string;
  bg: string;
  walk: boolean;
  opaque: boolean;
  name: string;
  water?: boolean;
  smooth?: boolean; // гладкая поверхность (зеркальце)
  anim?: 'water' | 'leaf' | 'glow';
}

export const TILES: Record<TileId, TileDef> = {
  grass: { ch: '.', fg: '#7fbf4a', bg: '#2c4a1c', walk: true, opaque: false, name: 'трава' },
  dirt: { ch: '.', fg: '#c49a6c', bg: '#4a3622', walk: true, opaque: false, name: 'тропинка' },
  floor: { ch: '.', fg: '#d8c8a8', bg: '#5a4a3a', walk: true, opaque: false, name: 'пол' },
  wood: { ch: '.', fg: '#c08a50', bg: '#5a3a20', walk: true, opaque: false, name: 'деревянный пол' },
  tile: { ch: '.', fg: '#bcd8e0', bg: '#40565e', walk: true, opaque: false, name: 'кафель', smooth: true },
  wet: { ch: '~', fg: '#8ad0f0', bg: '#3a5a6a', walk: true, opaque: false, name: 'мокрый пол', smooth: true },
  wall: { ch: '#', fg: '#f0e6d0', bg: '#9a8a72', walk: false, opaque: true, name: 'белая стена' },
  fwall: { ch: '#', fg: '#f0e6d0', bg: '#9a8a72', walk: false, opaque: true, name: 'белая стена' },
  fence: { ch: '=', fg: '#e07ab0', bg: '#3a2a1c', walk: false, opaque: false, name: 'забор с бугенвиллией' },
  euc: { ch: '♣', fg: '#9fd07a', bg: '#22401a', walk: false, opaque: true, name: 'эвкалипт', anim: 'leaf' },
  pine: { ch: '♠', fg: '#4fa060', bg: '#1a3418', walk: false, opaque: true, name: 'сосна', anim: 'leaf' },
  bush: { ch: '"', fg: '#5fbf5a', bg: '#2a4a1c', walk: true, opaque: true, name: 'кусты' },
  orange: { ch: '♣', fg: '#ffa630', bg: '#2a4a1c', walk: false, opaque: true, name: 'апельсиновое дерево', anim: 'leaf' },
  flower: { ch: '*', fg: '#ff6ab8', bg: '#2c4a1c', walk: true, opaque: false, name: 'бугенвиллия' },
  water: { ch: '~', fg: '#6ac8e8', bg: '#1e4a6a', walk: true, opaque: false, name: 'мелкая вода', water: true, anim: 'water' },
  deep: { ch: '≈', fg: '#4aa0d8', bg: '#123a5a', walk: true, opaque: false, name: 'глубокая вода', water: true, anim: 'water' },
  reeds: { ch: '|', fg: '#b8c860', bg: '#2a4030', walk: true, opaque: true, name: 'камыш', anim: 'leaf' },
  sand: { ch: '.', fg: '#e8d090', bg: '#6a5a30', walk: true, opaque: false, name: 'песок' },
  asphalt: { ch: '.', fg: '#9a9a9a', bg: '#3a3a3e', walk: true, opaque: false, name: 'асфальт' },
  rail: { ch: '#', fg: '#c0b0a0', bg: '#4a3a30', walk: true, opaque: false, name: 'рельсы' },
  door: { ch: '+', fg: '#e0a050', bg: '#5a3a20', walk: true, opaque: true, name: 'дверь' },
  window: { ch: '□', fg: '#a0e0ff', bg: '#9a8a72', walk: false, opaque: false, name: 'окно', smooth: true },
  broken: { ch: '□', fg: '#606060', bg: '#9a8a72', walk: false, opaque: false, name: 'разбитое окно' },
  bed: { ch: 'π', fg: '#e06060', bg: '#5a4a3a', walk: false, opaque: false, name: 'кровать' },
  table: { ch: 'π', fg: '#c09060', bg: '#5a4a3a', walk: false, opaque: false, name: 'стол' },
  stove: { ch: '&', fg: '#ff8040', bg: '#5a4a3a', walk: false, opaque: false, name: 'мамина плита', anim: 'glow' },
  poster: { ch: '¶', fg: '#ff4040', bg: '#9a8a72', walk: false, opaque: true, name: 'рок-постер' },
  sign: { ch: '¥', fg: '#ffe070', bg: '#4a3622', walk: false, opaque: false, name: 'вывеска' },
  stall: { ch: '▐', fg: '#8090a0', bg: '#40565e', walk: false, opaque: true, name: 'кабинка' },
  sink: { ch: 'o', fg: '#e0f0ff', bg: '#40565e', walk: false, opaque: false, name: 'раковина', smooth: true },
  wire: { ch: '%', fg: '#b0b0b0', bg: '#30302a', walk: false, opaque: false, name: 'колючая проволока' },
  tower: { ch: 'T', fg: '#c0c0a0', bg: '#30302a', walk: false, opaque: true, name: 'вышка' },
  pipe: { ch: 'Ω', fg: '#60e060', bg: '#2a3a2a', walk: true, opaque: false, name: 'старая труба', anim: 'glow' },
  hole: { ch: 'O', fg: '#806040', bg: '#1a120a', walk: true, opaque: false, name: 'яма' },
  mattress: { ch: '▬', fg: '#e0d0f0', bg: '#4a3622', walk: true, opaque: false, name: 'старый матрас' },
  roof: { ch: '^', fg: '#e05a3a', bg: '#7a2a1a', walk: true, opaque: false, name: 'крыша гаража' },
  shalash: { ch: 'Δ', fg: '#d0a060', bg: '#3a2a10', walk: true, opaque: false, name: 'шалаш', anim: 'glow' },
  site: { ch: '·', fg: '#d0a060', bg: '#2c3a18', walk: true, opaque: false, name: 'поляна для шалаша' },
  portal: { ch: '◊', fg: '#e080ff', bg: '#2a1040', walk: true, opaque: false, name: 'кроличья нора', anim: 'glow' },
  exit: { ch: '>', fg: '#ffffff', bg: '#205030', walk: true, opaque: false, name: 'переход', anim: 'glow' },
  void: { ch: ' ', fg: '#000000', bg: '#000000', walk: false, opaque: true, name: 'пустота' },
  snow: { ch: '.', fg: '#f0f8ff', bg: '#8aa0b8', walk: true, opaque: false, name: 'снег' },
  ice: { ch: '#', fg: '#c0f0ff', bg: '#6090b0', walk: false, opaque: true, name: 'лёд', smooth: true },
  cloud: { ch: '.', fg: '#ffffff', bg: '#7ab0e0', walk: true, opaque: false, name: 'облако' },
  stage: { ch: '.', fg: '#ff60a0', bg: '#2a1030', walk: true, opaque: false, name: 'сцена', anim: 'glow' },
  amp: { ch: '■', fg: '#303030', bg: '#101010', walk: false, opaque: true, name: 'усилитель' },
  throne: { ch: 'Ш', fg: '#ffb020', bg: '#5a2a10', walk: false, opaque: false, name: 'трон' },
  car: { ch: '▄', fg: '#4080c0', bg: '#3a3a3e', walk: false, opaque: false, name: 'папина машина', smooth: true },
  desk: { ch: 'π', fg: '#b08050', bg: '#4a4038', walk: false, opaque: false, name: 'парта' },
  piano: { ch: '♫', fg: '#f0f0f0', bg: '#202020', walk: false, opaque: false, name: 'пианино' },
  bin: { ch: 'u', fg: '#70a070', bg: '#3a3a3e', walk: false, opaque: false, name: 'мусорный бак' },
  hill: { ch: '∩', fg: '#c0a060', bg: '#4a3a1a', walk: true, opaque: false, name: 'холм' },
  locker: { ch: '▌', fg: '#5080c0', bg: '#4a4038', walk: false, opaque: true, name: 'шкафчики' },
  chalk: { ch: '▀', fg: '#20402a', bg: '#9a8a72', walk: false, opaque: true, name: 'доска' },
};

export function tileDef(t: TileId): TileDef {
  return TILES[t];
}
