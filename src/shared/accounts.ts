// Общие аккаунты игроков для игр на velvil24.github.io («Рыжий Рогалик», платформер и будущие).
// Все игры на одном домене видят один localStorage, поэтому профили общие:
// создал игрока в одной игре — он есть и в другой.
//
// Хранение:
//   velvil-accounts-v1        → { v: 1, current: id | null, profiles: Profile[] }
//   <gameId>@<profileId>      → сохранение конкретной игры для конкретного игрока (JSON)
//
// Перенос на другое устройство без сервера — «код переноса» (exportProfile / importProfile).
// Облачный вход (Supabase) позже ляжет поверх: profile.cloudId + синхронизация тех же ключей.
// Этот файл не зависит от игры — копируйте его без изменений.

export interface Profile {
  id: string;
  name: string;
  avatar: string; // эмодзи
  color: string;
  created: number;
  lastPlayed: number;
  cloudId?: string; // заполнится, когда появится облачный вход
}

interface Store {
  v: 1;
  current: string | null;
  profiles: Profile[];
}

export const ACCOUNTS_KEY = 'velvil-accounts-v1';
export const AVATARS = ['🐈', '🦊', '🐸', '🐶', '🦉', '🐢', '🦄', '🐙', '🚀', '🎸', '⚽', '🌟'];
export const COLORS = ['#ff8a20', '#ff6080', '#60b0ff', '#70d070', '#c080ff', '#ffd040', '#40d0c0', '#f0f0f0'];

function ls(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

// память на случай, если localStorage недоступен (приватный режим)
let memStore: Store | null = null;
const memData = new Map<string, string>();

function read(): Store {
  const s = ls();
  if (!s) return (memStore ??= { v: 1, current: null, profiles: [] });
  try {
    const raw = s.getItem(ACCOUNTS_KEY);
    if (raw) {
      const st = JSON.parse(raw) as Store;
      if (Array.isArray(st.profiles)) return st;
    }
  } catch {
    /* повреждённые данные — начинаем с чистого листа */
  }
  return { v: 1, current: null, profiles: [] };
}

function write(st: Store) {
  const s = ls();
  if (!s) {
    memStore = st;
    return;
  }
  try {
    s.setItem(ACCOUNTS_KEY, JSON.stringify(st));
  } catch {
    memStore = st;
  }
  notify();
}

const listeners = new Set<() => void>();
function notify() {
  for (const f of listeners) f();
}
/** Подписка на изменения (в том числе из другой вкладки или другой игры). */
export function onAccountsChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === ACCOUNTS_KEY) notify();
  });
}

const cleanName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, 24);

function newId(): string {
  const r = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(2)) : [Math.random() * 2 ** 32, Date.now()];
  return 'p' + [...r].map((n) => (n >>> 0).toString(36)).join('');
}

export function listProfiles(): Profile[] {
  return read().profiles.slice().sort((a, b) => b.lastPlayed - a.lastPlayed);
}

export function currentProfile(): Profile | null {
  const st = read();
  return st.profiles.find((p) => p.id === st.current) ?? null;
}

export function createProfile(name: string, avatar = AVATARS[0], color = COLORS[0]): Profile {
  const st = read();
  const n = cleanName(name) || `Игрок ${st.profiles.length + 1}`;
  const now = Date.now();
  const p: Profile = { id: newId(), name: n, avatar, color, created: now, lastPlayed: now };
  st.profiles.push(p);
  st.current = p.id;
  write(st);
  return p;
}

export function switchProfile(id: string): Profile | null {
  const st = read();
  const p = st.profiles.find((q) => q.id === id);
  if (!p) return null;
  st.current = id;
  p.lastPlayed = Date.now();
  write(st);
  return p;
}

export function updateProfile(id: string, patch: Partial<Pick<Profile, 'name' | 'avatar' | 'color' | 'cloudId'>>) {
  const st = read();
  const p = st.profiles.find((q) => q.id === id);
  if (!p) return;
  if (patch.name !== undefined) patch.name = cleanName(patch.name) || p.name;
  Object.assign(p, patch);
  write(st);
}

/** Удаляет игрока и его сохранения во ВСЕХ играх на этом устройстве. */
export function deleteProfile(id: string) {
  const st = read();
  st.profiles = st.profiles.filter((p) => p.id !== id);
  if (st.current === id) st.current = st.profiles[0]?.id ?? null;
  const s = ls();
  if (s) {
    for (const k of Object.keys(s)) if (k.endsWith('@' + id)) s.removeItem(k);
  }
  for (const k of [...memData.keys()]) if (k.endsWith('@' + id)) memData.delete(k);
  write(st);
}

/** Текущий игрок; если игроков нет — создаёт первого. */
export function ensureProfile(defaultName = 'Игрок 1'): Profile {
  const cur = currentProfile();
  if (cur) return cur;
  const any = listProfiles()[0];
  if (any) return switchProfile(any.id)!;
  return createProfile(defaultName);
}

// ───────── сохранения игр

const dataKey = (game: string, profileId: string) => `${game}@${profileId}`;

export function loadGameData<T>(game: string, profileId = ensureProfile().id): T | null {
  const k = dataKey(game, profileId);
  try {
    const raw = ls()?.getItem(k) ?? memData.get(k);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveGameData(game: string, data: unknown, profileId = ensureProfile().id) {
  const k = dataKey(game, profileId);
  const raw = JSON.stringify(data);
  try {
    const s = ls();
    if (s) s.setItem(k, raw);
    else memData.set(k, raw);
  } catch {
    memData.set(k, raw);
  }
}

/** Разовый перенос старого сохранения (до появления аккаунтов) в текущего игрока. */
export function migrateLegacy(game: string, legacyKey: string) {
  const s = ls();
  if (!s) return;
  const raw = s.getItem(legacyKey);
  if (raw == null) return;
  const p = ensureProfile();
  if (s.getItem(dataKey(game, p.id)) == null) s.setItem(dataKey(game, p.id), raw);
  s.removeItem(legacyKey);
}

// ───────── код переноса на другое устройство

function b64encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function b64decode(b64: string): string {
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Код со всеми сохранениями игрока во всех играх. */
export function exportProfile(id: string): string {
  const p = read().profiles.find((q) => q.id === id);
  if (!p) return '';
  const data: Record<string, string> = {};
  const s = ls();
  if (s) for (const k of Object.keys(s)) if (k.endsWith('@' + id)) data[k.slice(0, -id.length - 1)] = s.getItem(k)!;
  for (const [k, v] of memData) if (k.endsWith('@' + id)) data[k.slice(0, -id.length - 1)] = v;
  return 'VLV1-' + b64encode(JSON.stringify({ p, data }));
}

/** Принимает код переноса. Если такой игрок уже есть — его сохранения заменяются. */
export function importProfile(code: string): Profile {
  const c = code.trim().replace(/\s+/g, '');
  if (!c.startsWith('VLV1-')) throw new Error('Это не код переноса игрока.');
  let parsed: { p: Profile; data: Record<string, string> };
  try {
    parsed = JSON.parse(b64decode(c.slice(5)));
  } catch {
    throw new Error('Код повреждён — скопируйте его целиком.');
  }
  const { p, data } = parsed;
  if (!p?.id || typeof p.name !== 'string') throw new Error('Код повреждён — скопируйте его целиком.');
  const st = read();
  const prof: Profile = { ...p, name: cleanName(p.name) || 'Игрок', lastPlayed: Date.now() };
  st.profiles = st.profiles.filter((q) => q.id !== p.id);
  st.profiles.push(prof);
  st.current = prof.id;
  for (const [game, raw] of Object.entries(data ?? {})) {
    if (typeof raw === 'string') saveGameData(game, JSON.parse(raw), prof.id);
  }
  write(st);
  return prof;
}
