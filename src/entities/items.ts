// Предметы. Эффекты применяются в systems/useItem.ts.

export type ItemKind = 'food' | 'weapon' | 'throw' | 'tool' | 'quest' | 'key' | 'wear' | 'meta';

export interface ItemDef {
  id: string;
  name: string;
  ch: string;
  color: string;
  kind: ItemKind;
  desc: string;
  food?: number;
  heal?: number; // абсолютное лечение
  healPct?: number;
  atk?: number;
  stack?: boolean;
}

export const ITEMS: Record<string, ItemDef> = {
  bamba: { id: 'bamba', name: 'Бамба', ch: '%', color: '#ffd040', kind: 'food', food: 20, stack: true, desc: '+20 сытости. Арахисовые палочки, вкус детства.' },
  pita: { id: 'pita', name: 'Пита', ch: '%', color: '#e8c080', kind: 'food', food: 30, heal: 2, stack: true, desc: '+30 сытости, +2 ❤️.' },
  watermelon: { id: 'watermelon', name: 'Арбуз', ch: '%', color: '#ff4060', kind: 'food', food: 40, heal: 6, stack: true, desc: '+40 сытости, лечит. Можно поделиться с друзьями (лечит всех рядом).' },
  mammoth: { id: 'mammoth', name: 'Мамонтовое мясо', ch: '%', color: '#c06040', kind: 'food', food: 100, healPct: 100, stack: true, desc: 'Легендарное. Полное лечение + 3 хода неуязвимости. Якут клянётся, что дедушка нашёл его в вечной мерзлоте.' },
  cutlet: { id: 'cutlet', name: 'Мамины котлеты', ch: '%', color: '#b07040', kind: 'food', food: 50, healPct: 50, stack: true, desc: 'Лечат 50% здоровья. Лечат всё.' },
  candy: { id: 'candy', name: 'Конфетная заначка Эмили', ch: '%', color: '#ff90e0', kind: 'food', food: 25, heal: 10, stack: true, desc: 'Секретная заначка сестры. +10 ❤️.' },
  rock: { id: 'rock', name: 'Камень', ch: '*', color: '#b0a090', kind: 'throw', atk: 3, stack: true, desc: 'Метательное оружие (клавиша T).' },
  stick: { id: 'stick', name: 'Палка из леса', ch: '/', color: '#c08a50', kind: 'weapon', atk: 2, desc: 'Оружие ближнего боя, +2 к урону. Ею же можно простукивать стены.' },
  hose: { id: 'hose', name: 'Садовый шланг', ch: '~', color: '#40c040', kind: 'weapon', atk: 1, desc: 'Первое оружие Бени. +1 к урону.' },
  skate: { id: 'skate', name: 'Скейт', ch: '=', color: '#40a0ff', kind: 'tool', desc: 'По асфальту Бени двигается в 2 раза быстрее.' },
  guitar: { id: 'guitar', name: 'Гитара', ch: '♪', color: '#ff8030', kind: 'tool', desc: 'Аккорды (клавиша G).' },
  flashlight: { id: 'flashlight', name: 'Фонарик', ch: '!', color: '#ffff80', kind: 'tool', desc: 'Освещает ночь: радиус обзора больше.' },
  cap: { id: 'cap', name: 'Кепка-«пилотка»', ch: '^', color: '#60a060', kind: 'wear', desc: '+1 к Наглости.' },
  cassette: { id: 'cassette', name: 'Рок-кассета', ch: '▪', color: '#ff60ff', kind: 'tool', stack: true, desc: 'Восстанавливает Драйв.' },
  string: { id: 'string', name: 'Гитарная струна', ch: '§', color: '#e0e0ff', kind: 'quest', stack: true, desc: 'Одна из шести струн для гитары Бени.' },
  pick: { id: 'pick', name: 'Старая медиаторка', ch: '◄', color: '#ffb060', kind: 'wear', desc: 'Подарок соседа. +2 к Року.' },
  patch: { id: 'patch', name: 'Лётная нашивка', ch: '✈', color: '#80c0ff', kind: 'quest', desc: 'Редкий артефакт с военной базы.' },
  coin_roman: { id: 'coin_roman', name: 'Монета римского императора', ch: '$', color: '#ffd700', kind: 'quest', desc: 'Пасхалка: древняя монета со дна речки. Якорь памяти о Сомике.' },
  cassette_album: { id: 'cassette_album', name: 'Кассета с первым альбомом', ch: '▪', color: '#ff2020', kind: 'quest', desc: 'Включает секретный трек.' },
  jacket: { id: 'jacket', name: 'Лётная куртка папы', ch: '[', color: '#806040', kind: 'wear', desc: 'Стиль +10. И +1 к защите.' },
  mirror: { id: 'mirror', name: 'Карманное зеркальце', ch: 'o', color: '#e0f0ff', kind: 'tool', desc: 'От мамы Нины. Отражение работает на любой гладкой поверхности (окно, кафель, металл).' },
  binoculars: { id: 'binoculars', name: 'Бинокль папы Вовы', ch: '8', color: '#a0a0a0', kind: 'tool', desc: 'L работает на расстоянии 6 клеток.' },
  notebook: { id: 'notebook', name: 'Блокнот', ch: '≡', color: '#f0f0d0', kind: 'tool', desc: 'Записывает найденные секреты и подсказки.' },
  memory_coin: { id: 'memory_coin', name: 'Монета-воспоминание', ch: '¢', color: '#ffe0a0', kind: 'meta', stack: true, desc: '+1 «Воспоминание» для Альбома.' },
  pebble: { id: 'pebble', name: 'Речная галька', ch: '•', color: '#a0b0c0', kind: 'quest', desc: 'Якорь памяти о Сомике.' },
  wrench: { id: 'wrench', name: 'Папин ключ на 10', ch: '¬', color: '#c0c0c0', kind: 'quest', desc: 'Инструмент. Папа просил принести.' },
  card: { id: 'card', name: 'Открытка для мамы', ch: '♥', color: '#ff80a0', kind: 'quest', desc: 'Нарисована сегодня. Немного кривая, но от души.' },
  // материалы для шалаша
  branches: { id: 'branches', name: 'Ветки', ch: '‡', color: '#a07040', kind: 'quest', stack: true, desc: 'Материал для шалаша.' },
  cardboard: { id: 'cardboard', name: 'Картон', ch: '▫', color: '#c0a070', kind: 'quest', stack: true, desc: 'Материал для шалаша.' },
  blanket: { id: 'blanket', name: 'Старое одеяло', ch: '≈', color: '#8060a0', kind: 'quest', stack: true, desc: 'Материал для шалаша.' },
  rope: { id: 'rope', name: 'Верёвка', ch: '§', color: '#d0c080', kind: 'quest', stack: true, desc: 'Материал для шалаша.' },
  // ключи миров (уровень 1)
  key_cats: { id: 'key_cats', name: 'Ключ «Кошачья лапка»', ch: '⚷', color: '#ff9030', kind: 'key', desc: 'Отпирает нору в Мир Рыжих Котов.' },
  key_som: { id: 'key_som', name: 'Ключ «Чешуйка»', ch: '⚷', color: '#40c0ff', kind: 'key', desc: 'Отпирает нору в Подводное царство Сомика.' },
  key_frost: { id: 'key_frost', name: 'Ключ «Бивень»', ch: '⚷', color: '#e0f0ff', kind: 'key', desc: 'Отпирает нору в Мамонтову мерзлоту.' },
  key_rock: { id: 'key_rock', name: 'Ключ «Медиатор»', ch: '⚷', color: '#ff40a0', kind: 'key', desc: 'Отпирает нору в Рок-измерение.' },
  key_sky: { id: 'key_sky', name: 'Ключ «Крылышки»', ch: '⚷', color: '#a0d0ff', kind: 'key', desc: 'Отпирает нору в Небо реактивных самолётов.' },
  key_rogue: { id: 'key_rogue', name: 'Ключ «@»', ch: '⚷', color: '#ffffff', kind: 'key', desc: 'Отпирает нору в Перевёрнутый мир.' },
  clock_shard: { id: 'clock_shard', name: 'Осколок часов', ch: '◔', color: '#ffd080', kind: 'quest', stack: true, desc: 'Из четырёх осколков (боссы 1–4) собирается ключ K-14.' },
};

export function itemDef(id: string): ItemDef {
  const d = ITEMS[id];
  if (!d) throw new Error('Неизвестный предмет ' + id);
  return d;
}
