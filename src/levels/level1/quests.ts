// Уровень 1: состояние квестов и общие помощники.
import type { Game } from '../../engine/game';

export const STRINGS: [string, string][] = [
  ['str_vova', 'У папы в гараже (после помощи с ремонтом велосипеда)'],
  ['str_enbar', 'У Энбара — он отдаст, если выслушать его'],
  ['str_river', 'На дне речки — нырнуть рядом с Сомиком'],
  ['str_elder', 'В шалаше старших ребят в лесу'],
  ['str_emily', 'У Эмили — за честный обмен (или кражу, но это −Любовь)'],
  ['str_school', 'В школьном музыкальном классе'],
];

export const FRIENDS = ['enbar', 'ido', 'amir', 'gaya', 'yonatan', 'yakut'] as const;
export const FRIEND_NAMES: Record<string, string> = { enbar: 'Энбар', ido: 'Идо', amir: 'Амир', gaya: 'Гая', yonatan: 'Йонатан', yakut: 'Якут' };
export const GINGERS: Record<string, { name: string; bonus: string }> = {
  apelsin: { name: 'Апельсин', bonus: 'удача: иногда двойной урон' },
  shekel: { name: 'Шекель', bonus: 'автоподбор предметов рядом' },
  captain: { name: 'Капитан', bonus: 'ночное зрение' },
  hummus: { name: 'Хумус', bonus: '+5 к здоровью (толстый и тёплый)' },
  phoenix: { name: 'Феникс', bonus: '+1 к силе (дикий и смелый)' },
};

export function stringsCount(g: Game) {
  return STRINGS.filter(([k]) => g.flags[k]).length;
}

export function giveString(g: Game, key: string, where: string) {
  if (g.flags[key]) return;
  g.flags[key] = true;
  g.addItem('string', 1, true);
  const n = stringsCount(g);
  g.msg(`§ Струна №${n} из 6 — ${where}!`, '#e0e0ff');
  g.hooks.sfx('pickup');
  if (n === 6) g.msg('Все шесть струн! Скорее домой — к гитаре на стене.', '#ffd060');
}

export function loveTasksDone(g: Game) {
  return ['lv_dishes', 'lv_tool', 'lv_card', 'lv_grade'].filter((k) => g.flags[k]).length;
}

export function befriend(g: Game, who: string) {
  if (g.flags['friend_' + who]) return;
  g.flags['friend_' + who] = true;
  g.addXp(8);
}

export function friendsCount(g: Game) {
  return FRIENDS.filter((f) => g.flags['friend_' + f]).length;
}

export function gsGive(g: Game, who: string, text: string) {
  g.flags['gs_' + who] = true;
  const n = FRIENDS.filter((f) => g.flags['gs_' + f]).length;
  g.msg(`${text} (Великий Шалаш: ${n}/6)`, '#d0a060');
  if (n === 6) g.msg('Все материалы собраны! Идите на большую поляну в лесу.', '#ffd060');
}

export function startDinner(g: Game) {
  const f = g.flags;
  f.dinnerDone = true;
  g.pushDialog({
    who: 'Ужин',
    color: '#ff90b0',
    text: 'Вечер. Мамины котлеты, папа режет арбуз, Эмили болтает ногами под столом.\n\nМама Нина: «Знаете, о чём вы всё время спорите? Кого мы больше любим». Папа Вова: «Так вот. Одинаково. Обоих. Точка».\n\nБени и Эмили переглядываются…\nЭмили: «А я всё равно больше люблю маму, чем ты!»\nБени: «Чего?! Это я больше!»\n\n…и начинается новый спор 😄',
    options: [{
      label: 'Обнять всех',
      act: () => {
        g.stats.love = 50;
        g.givePerk('family');
        g.addItem('mirror');
        g.heal(g.player, g.player.maxHp);
        g.achieve('family', 'Кого больше любят?');
        g.msg('Мама даёт Бени карманное зеркальце: «Чтобы ты видел, какой ты чумазый». (Отражение на любой гладкой поверхности.)', '#ff90b0');
      },
    }],
  });
}

export interface QuestLine {
  name: string;
  state: string;
  done: boolean;
}

export function questLog(g: Game): QuestLine[] {
  const f = g.flags;
  const q: QuestLine[] = [];
  const sc = stringsCount(g);
  q.push({ name: '🎸 Первая струна', state: f.guitar ? 'Гитара собрана! Аккорды E и A.' : `Струн: ${sc}/6. ` + STRINGS.filter(([k]) => !f[k]).map(([, d]) => d).join('; '), done: !!f.guitar });
  const wq: Record<string, string> = { offered: 'Амир подначивает кинуть камень в окно (T, глядя на окно)', broken: f.mustApologize ? 'Извиниться перед соседом' : 'Окно разбито… вечером разговор с папой', refused: 'Отказался. Мама узнает и будет гордиться', bees: 'Пчелиный рой!', apologized: 'Сосед оказался добрым стариком' };
  q.push({ name: '🪨 Окно и камень', state: f.windowQuest ? wq[f.windowQuest] : 'Поговори с Амиром у дома соседа', done: ['apologized', 'bees'].includes(f.windowQuest) || (f.windowQuest === 'refused' && f.ninaProud) });
  q.push({ name: '🥊 Двое в туалете', state: f.frenchState === 'won' ? 'Французы теперь уважают Бени' : f.frenchState === 'lost' ? 'Синяк… Можно попробовать снова' : 'Школьный туалет. Лучше прийти с друзьями', done: f.frenchState === 'won' });
  q.push({ name: '🐟 Легенда о Сомике', state: f.somReleased ? 'Сомик отпущен — теперь он дух реки' : f.somKept ? 'Сомик остался у Бени… речка стала тише' : f.somMet ? 'Нужна особая приманка — мамонтовое мясо от Якута' : 'Найди Сомика на речке', done: !!(f.somReleased || f.somKept) });
  const gsn = FRIENDS.filter((x) => f['gs_' + x]).length;
  q.push({ name: '🛖 Великий Шалаш', state: f.greatBuilt ? 'Построен! Ночью — страшилки у костра' : f.greatStarted ? `Материалы: ${gsn}/6 (${FRIENDS.filter((x) => !f['gs_' + x]).map((x) => FRIEND_NAMES[x]).join(', ')})` : 'Подружись хотя бы с двумя друзьями и поговори с Якутом', done: !!f.greatBuilt });
  const gn = (f.gingers ?? []).length;
  q.push({ name: '🐱 Рыжая армия', state: f.kingSpawned ? 'Рыжий Король спустился с крыши!' : `Рыжих котов: ${gn}/5 (Апельсин у баков, Шекель в кафе, Капитан на крыше школы, Хумус во дворе, Феникс в лесу ночью)`, done: !!f.kingSpawned });
  q.push({ name: '💛 Кого больше любят?', state: f.dinnerDone ? 'Ужин. Любят одинаково!' : f.loveStarted ? `Дела: ${loveTasksDone(g)}/3 (посуда, инструмент папе, открытка маме, пятёрка)` : 'Спроси маму', done: !!f.dinnerDone });
  q.push({ name: '🦘 Прыжок с крыши', state: `Прыжков: ${f.roofJumps ?? 0}/3`, done: (f.roofJumps ?? 0) >= 3 });
  const st = (f.strange ?? []).length;
  q.push({ name: '🐸 Странные коты', state: `Найдено: ${st}/4 (гавкают и квакают)`, done: st >= 4 });
  q.push({ name: '🚂 «Железный Грохот»', state: f.bossDone ? 'Побеждён' : f.guitar ? 'Ночью на переезде…' : 'Сначала нужна гитара', done: !!f.bossDone });
  return q;
}
