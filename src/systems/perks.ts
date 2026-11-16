// Перки. pickable — можно выбрать при повышении уровня; остальные выдаются за квесты.

export type PerkId =
  | 'cat' | 'stone' | 'somfriend' | 'shalash' | 'riff' | 'vova' | 'nina'
  | 'eagle' | 'hebrew' | 'gingerfriend' | 'deep' | 'coldhead' | 'family';

export const PERKS: Record<PerkId, { name: string; desc: string; pickable: boolean }> = {
  cat: { name: 'Ловкий как кот', desc: '+1 уклонение (враги промахиваются чаще).', pickable: true },
  stone: { name: 'Камень в окно', desc: 'Бросок камня оглушает врага на 2 хода (но есть шанс разбить стекло).', pickable: true },
  somfriend: { name: 'Друг сомика', desc: 'Дышишь под водой на 5 ходов дольше.', pickable: true },
  shalash: { name: 'Шалашник', desc: 'Шалаши строятся за 1 ход и лечат на 50%.', pickable: true },
  riff: { name: 'Громкий рифф', desc: 'Первый аккорд в бою пугает всех врагов в радиусе 3.', pickable: true },
  vova: { name: 'Сын Вовы', desc: 'Папин совет раз за этаж раскрывает карту.', pickable: true },
  nina: { name: 'Сын Нины', desc: 'Мамина еда лечит в 2 раза больше.', pickable: true },
  gingerfriend: { name: 'Друг рыжих', desc: 'Рыжие коты охотнее дают гладить (2 поглаживания вместо 3).', pickable: true },
  deep: { name: 'Дыхание глубины', desc: '+10 ходов под водой (суммируется с «Другом сомика»).', pickable: true },
  hebrew: { name: 'Читатель справа налево', desc: 'В мире иврита все надписи читаются автоматически и без хода.', pickable: true },
  eagle: { name: 'Орлиный глаз', desc: 'L показывает направление ближайшей норы.', pickable: false },
  coldhead: { name: 'Холодная голова', desc: 'Враги не видят Бени в тени (ночью, в кустах и камышах).', pickable: false },
  family: { name: 'Семья', desc: 'При 1 HP раз за забег мама с папой «спасают» (полное лечение).', pickable: false },
};
