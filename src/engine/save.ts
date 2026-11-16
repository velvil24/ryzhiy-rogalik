// «Альбом воспоминаний» — мета-прогресс между забегами. Хранится в localStorage.

export interface Album {
  memories: number; // мета-валюта
  runs: number;
  deaths: number;
  bestLevel: number;
  unlocks: Record<string, boolean>; // startGuitar, extraHeart, startCat, somPhoto, shalashFast
  secretsFound: string[];
  achievements: string[];
  pages: { date: string; level: number; text: string }[];
  kingFollows: boolean; // Рыжий Король начинает каждый забег с Бени
  keyCopies: string[];
  strangeCats: string[];
  burrowNotes: string[]; // «где и что нужно» для запертых нор
  totalSecrets: number;
}

const KEY = 'ryzhiy-rogalik-album-v1';

export function emptyAlbum(): Album {
  return {
    memories: 0, runs: 0, deaths: 0, bestLevel: 1, unlocks: {}, secretsFound: [], achievements: [],
    pages: [], kingFollows: false, keyCopies: [], strangeCats: [], burrowNotes: [], totalSecrets: 44,
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadAlbum(): Album {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return emptyAlbum();
    return { ...emptyAlbum(), ...JSON.parse(raw) };
  } catch {
    return emptyAlbum();
  }
}

export function saveAlbum(a: Album) {
  try {
    storage()?.setItem(KEY, JSON.stringify(a));
  } catch {
    /* приватный режим и т.п. — игра работает и без сохранения */
  }
}

export const UNLOCKS: { id: string; name: string; cost: number; desc: string }[] = [
  { id: 'startGuitar', name: 'Стартовая гитара', cost: 12, desc: 'Начинать забег с гитарой (без струн аккорды слабее, но работают E и A).' },
  { id: 'extraHeart', name: 'Дополнительное сердце', cost: 6, desc: '+5 к максимальному здоровью в начале забега.' },
  { id: 'startCat', name: 'Стартовый кот', cost: 8, desc: 'Хумус сразу ваш компаньон.' },
  { id: 'somPhoto', name: 'Фотография с Сомиком', cost: 10, desc: 'Туман взросления опускает память о Сомике не до 1, а до 2.' },
  { id: 'secretZones', name: 'Карта секретов', cost: 15, desc: 'Папа Вова в начале забега рассказывает про одну трубу.' },
];
