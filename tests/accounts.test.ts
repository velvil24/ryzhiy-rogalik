import { describe, it, expect, beforeEach } from 'vitest';

// простой localStorage для node
class MemStorage {
  m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
const store = new MemStorage();
// Object.keys(localStorage) в браузере перечисляет ключи — эмулируем через Proxy
(globalThis as any).localStorage = new Proxy(store, {
  ownKeys: () => [...store.m.keys()],
  getOwnPropertyDescriptor: (_t, k) => (store.m.has(k as string) ? { enumerable: true, configurable: true, value: store.m.get(k as string) } : undefined),
});

import * as acc from '../src/shared/accounts';
import { loadAlbum, saveAlbum } from '../src/engine/save';

describe('аккаунты игроков', () => {
  beforeEach(() => store.clear());

  it('старое сохранение переносится в первого игрока', () => {
    store.setItem('ryzhiy-rogalik-album-v1', JSON.stringify({ memories: 7, runs: 3 }));
    const a = loadAlbum();
    expect(a.memories).toBe(7);
    expect(acc.listProfiles()).toHaveLength(1);
    expect(store.getItem('ryzhiy-rogalik-album-v1')).toBeNull();
  });

  it('у каждого игрока свой альбом, переключение работает', () => {
    const p1 = acc.createProfile('Бени');
    const a = loadAlbum();
    a.memories = 5;
    saveAlbum(a);
    const p2 = acc.createProfile('Эмили', '🦄', '#ff6080');
    expect(acc.currentProfile()!.id).toBe(p2.id);
    expect(loadAlbum().memories).toBe(0);
    acc.switchProfile(p1.id);
    expect(loadAlbum().memories).toBe(5);
  });

  it('данные разных игр одного игрока не смешиваются, удаление чистит все игры', () => {
    const p = acc.createProfile('Вова');
    acc.saveGameData('rogalik', { memories: 1 });
    acc.saveGameData('platformer', { coins: 9 });
    expect(acc.loadGameData<any>('platformer')!.coins).toBe(9);
    acc.deleteProfile(p.id);
    expect(store.getItem(`rogalik@${p.id}`)).toBeNull();
    expect(store.getItem(`platformer@${p.id}`)).toBeNull();
  });

  it('код переноса восстанавливает игрока со всеми играми', () => {
    const p = acc.createProfile('Нина', '🦊');
    acc.saveGameData('rogalik', { memories: 42 });
    acc.saveGameData('platformer', { level: 3 });
    const code = acc.exportProfile(p.id);
    expect(code.startsWith('VLV1-')).toBe(true);
    store.clear(); // «другое устройство»
    const q = acc.importProfile(code);
    expect(q.name).toBe('Нина');
    expect(acc.currentProfile()!.id).toBe(p.id);
    expect(acc.loadGameData<any>('rogalik')!.memories).toBe(42);
    expect(acc.loadGameData<any>('platformer')!.level).toBe(3);
    expect(() => acc.importProfile('мусор')).toThrow();
  });

  it('имя чистится и обрезается', () => {
    const p = acc.createProfile('   Очень    длинное имя игрока для проверки обрезки   ');
    expect(p.name.length).toBeLessThanOrEqual(24);
    expect(p.name.startsWith('Очень длинное')).toBe(true);
  });
});
