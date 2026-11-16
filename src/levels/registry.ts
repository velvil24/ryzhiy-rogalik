// Реестр уровней. Каждый уровень — модуль с генерацией карт и сценарными обработчиками.
import type { Game, Dialog } from '../engine/game';
import type { Actor, GameMap, Prop, Sign } from '../engine/types';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';

export interface LevelModule {
  num: number;
  name: string;
  stage: string;
  intro: string[];
  build(g: Game): { startMap: string };
  talk(g: Game, a: Actor): Dialog | null;
  prop(g: Game, p: Prop): boolean;
  onEnterMap?(g: Game, m: GameMap): void;
  onTurn?(g: Game): void;
  onKill?(g: Game, a: Actor): void;
  onDefeat?(g: Game, a: Actor): boolean; // true — не убивать (например, французы просто сдаются)
  onPlayerDown?(g: Game, by?: Actor): boolean; // true — смерть предотвращена
  onPickup?(g: Game, item: string): void;
  onRead?(g: Game, s: Sign): void;
  onCatFriend?(g: Game, c: Actor): void;
  onStrangeCat?(g: Game, c: Actor): void;
  onThrowHit?(g: Game, p: Prop): boolean;
  onWindowBroken?(g: Game, x: number, y: number): void;
  onJump?(g: Game, fx: number, fy: number, tx: number, ty: number, fromRoof: boolean): boolean;
  onChord?(g: Game, c: string): void;
  onLoud?(g: Game): void;
  onCaught?(g: Game, a: Actor): void;
  onLevelExit?(g: Game): void;
  canExit?(g: Game, to: string): string | null;
  chordBonus?(g: Game): number;
  ai?(g: Game, a: Actor): boolean;
  /** Ключевые точки для тестов достижимости: id карты → точки. */
  keyPoints?(g: Game): Record<string, { x: number; y: number; what: string }[]>;
}

export const LEVELS: LevelModule[] = [level1, level2, level3, level4, level5];
