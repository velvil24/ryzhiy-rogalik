// Уровень 1: разговоры с персонажами.
import type { Dialog, DialogOpt, Game } from '../../engine/game';
import type { Actor } from '../../engine/types';
import { ITEMS } from '../../entities/items';
import { giveString, stringsCount, loveTasksDone, startDinner, befriend, friendsCount, gsGive } from './quests';

const he = (orig: string, tr: string, ru: string) => ({ orig, tr, ru, rtl: true });

const YAKUT_STORIES = [
  'Дедушка нашёл мамонта в вечной мерзлоте. Отрезал кусочек. Мамонт не возражал.',
  'Мамонт сам пришёл к деду погреться. Ну и… остался в морозилке.',
  'Это не простое мясо. Это мясо мамонта-чемпиона по прыжкам. Поэтому я так прыгаю!',
  'Дед выменял его у шамана на транзистор. Шаман теперь слушает «Кино».',
  'Его прислали посылкой из Якутска. Почта шла 40 000 лет.',
  'Мамонт был последним. Он завещал своё мясо лучшим прыгунам. То есть мне.',
  'Ладно, правда: его нашёл не дед, а прадед. А прадед прыгал с крыши Якутского драмтеатра!',
];

function d(who: string, color: string, text: string, options: DialogOpt[], extra: Partial<Dialog> = {}): Dialog {
  return { who, color, text, options, ...extra };
}
const bye: DialogOpt = { label: 'Пока!' };

export function talkL1(g: Game, a: Actor): Dialog | null {
  const f = g.flags;
  switch (a.kind) {
    // ───────────────────────── мама Нина
    case 'nina': {
      const opts: DialogOpt[] = [];
      const day = Math.floor(g.turn / 400);
      if (f.ninaCutletDay !== day) opts.push({ label: '«Мам, можно котлету?»', act: () => { f.ninaCutletDay = day; g.addItem('cutlet'); g.hooks.voice('nina_2_ru'); } });
      if (!f.loveStarted) opts.push({ label: '«Мам, а кого ты больше любишь — меня или Эмили?»', act: () => {
        f.loveStarted = true;
        g.popup('Мама Нина', '«Ну что за вопросы! Помоги-ка лучше по дому: помой посуду у плиты, отнеси папе инструмент, нарисуй открытку. А там посмотрим, кто у нас молодец».\n\nКвест «Кого больше любят?» начат.', '#ff90b0');
      } });
      if (g.hasItem('card') && !f.lv_card) opts.push({ label: '«Это тебе, мам!» (отдать открытку)', act: () => { g.removeItem('card'); f.lv_card = true; g.stats.love += 8; g.popup('Мама Нина', '«Ой, какая красивая! Это я? А почему у меня шесть пальцев? Ну всё равно спасибо, родной».', '#ff90b0'); } });
      if (f.windowQuest === 'refused' && !f.ninaProud) opts.push({ label: '«Мам, я сегодня не кинул камень в окно соседа»', act: () => { f.ninaProud = true; g.stats.love += 10; g.popup('Мама Нина', '«Я уже знаю. Мне Гая рассказала… то есть Амир. Я тобой горжусь, Бени». (+Любовь)', '#ff90b0'); } });
      if (loveTasksDone(g) >= 3 && !f.dinnerDone) opts.push({ label: '«Мам, что на ужин?»', act: () => startDinner(g) });
      opts.push({ label: '«Мам, есть что-нибудь вкусное в дорогу?»', act: () => {
        if (g.rng.chance(0.5)) g.addItem(g.rng.pick(['bamba', 'pita', 'watermelon']));
        else g.popup('Мама Нина', '«Сначала руки помой! …Ладно, на, держи бамбу». ', '#ff90b0', () => g.addItem('bamba'));
      } });
      opts.push(bye);
      const first = !f.ninaMet;
      f.ninaMet = true;
      return d('Мама Нина', '#ff90b0', first ? '«Бени, ты опять весь в грязи?!»' : g.rng.pick(['«Иди есть, котлеты остынут!»', '«Бени, ты опять весь в грязи?!»', '«Не ходи на пути, слышишь? Там поезда!»', '«Эмили опять пятёрку принесла. А ты?»']), opts, {
        voice: first ? 'nina_1_ru' : undefined,
        foreign: first ? he('בני, שוב אתה כולך בוץ?!', 'Бени, шув ата кульха буц?!', 'Бени, ты опять весь в грязи?!') : undefined,
      });
    }
    // ───────────────────────── папа Вова
    case 'vova': {
      const opts: DialogOpt[] = [];
      if (f.windowQuest === 'broken' && !f.vovaTalkWindow) {
        f.vovaTalkWindow = true;
        return d('Папа Вова', '#80b0ff', '«Сынок, ну и зачем ты это сделал?»\n\nПапа долго молчит. Потом откладывает отвёртку.', [
          { label: '«Пап, прости. Друзья подначили…»', act: () => { f.mustApologize = true; g.popup('Папа Вова', '«Друзья подначили, а окно разбил ты. Пойдём. Извинишься перед соседом — сам, своими словами». (Поговори с ворчливым соседом.)', '#80b0ff'); } },
          { label: '«Я не виноват!»', act: () => { f.mustApologize = true; g.stats.love -= 5; g.hooks.voice('beni_3_ru'); g.popup('Папа Вова', '«Мама, я не виноват» — это ты маме будешь рассказывать. А мне — правду. Идём к соседу.»', '#80b0ff'); } },
        ], { voice: 'vova_1_ru', foreign: he('בני, למה עשית את זה?', 'Бни, лама асита эт зе?', 'Сынок, зачем ты это сделал?') });
      }
      if (!f.str_vova) {
        if (g.hasItem('wrench')) opts.push({ label: '«Пап, вот твой ключ на 10! Давай починим велик?»', act: () => {
          g.removeItem('wrench');
          f.lv_tool = true;
          g.stats.love += 6;
          g.popup('Папа Вова', 'Вы вдвоём чините велосипед: папа держит, Бени крутит. «Руки у тебя растут откуда надо». В ящике с инструментами находится запасная гитарная струна — «Держи, тебе нужнее». И ещё старый бинокль.', '#80b0ff', () => { giveString(g, 'str_vova', 'от папы, за ремонт велосипеда'); g.addItem('binoculars'); });
        } });
        else opts.push({ label: '«Пап, а у тебя есть гитарная струна?»', act: () => g.popup('Папа Вова', '«Есть одна, где-то в ящике. Только сначала помоги с великом. Найди мой ключ на 10 — я его где-то во дворе посеял».', '#80b0ff') });
      }
      if ((f.takeoffs ?? 0) >= 3 && !f.jacket) opts.push({ label: '«Пап, я опять смотрел, как взлетают самолёты…»', act: () => { f.jacket = true; g.popup('Папа Вова', '«Третий раз, говоришь? Ну, держи. Это моя старая лётная куртка. Носи, пилот». (Пасхалка «Костюм пилота»)', '#80b0ff', () => { g.addItem('jacket'); g.achieve('pilot', 'Костюм пилота'); }); } });
      opts.push({ label: '«Пап, дай совет»', act: () => g.popup('Папа Вова', g.rng.pick([
        '«Не все ямы в лесу смертельные. Некоторые ведут в очень интересные места».',
        '«Видишь старую трубу — не бойся заглянуть внутрь. Встань на неё и спускайся (>).»',
        '«Если стена звучит пусто — простучи её палкой».',
        '«Иногда, чтобы что-то увидеть, надо встать в правильном месте и посмотреть под правильным углом (Shift+стрелка, потом L)».',
        '«Вода показывает больше, чем кажется. Присмотрись к отражению (L у воды)».',
        '«Коты знают больше нас. Если кот смотрит в пустоту — проследи за его взглядом».',
        '«Поезд по расписанию — каждые полтора часа. Слышишь гудок — уходи с рельсов».',
      ]), '#80b0ff') });
      if (g.hasItem('guitar') && !f.bossDone) opts.push({ label: '«Пап, а правда, что ночью по путям ходит поезд-призрак?»', act: () => g.popup('Папа Вова', '«Это ты у Якута наслушался. …Но если пойдёшь — возьми гитару и друзей. Страхи громкую музыку не любят». (Ночью выйди на переезд у железной дороги.)', '#80b0ff') });
      opts.push(bye);
      return d('Папа Вова', '#80b0ff', g.rng.pick(['«Чего тебе, сынок?»', '«Опять под машину лазил?»', '«Руками надо работать, Бени. Руками»']), opts);
    }
    // ───────────────────────── Эмили
    case 'emily': {
      const opts: DialogOpt[] = [];
      const offended = g.stats.love > 72;
      if (!f.str_emily && !offended) {
        if (g.hasItem('bamba', 2)) opts.push({ label: '«Меняю две бамбы на гитарную струну. Честно!»', act: () => { g.removeItem('bamba', 2); g.popup('Эмили', '«Две бамбы? …Ладно. Но струну я нашла первая, так и знай».', '#ffa0ff', () => giveString(g, 'str_emily', 'честный обмен с Эмили')); } });
        else opts.push({ label: '«Отдай струну!»', act: () => g.popup('Эмили', '«А что мне за это будет? Хочу две бамбы. Честный обмен!»', '#ffa0ff') });
        opts.push({ label: '(Стащить струну, пока она не смотрит)', act: () => { g.stats.love -= 15; g.popup('Эмили', 'Бени тихонько забирает струну со стола. Эмили всё видела. «Я маме расскажу!» (−Любовь)', '#ffa0ff', () => giveString(g, 'str_emily', 'стащил у Эмили')); } });
      }
      const balanced = g.stats.love >= 38 && g.stats.love <= 62;
      if (balanced && !f.emilyCandy && (loveTasksDone(g) >= 2 || f.dinnerDone)) opts.push({ label: '«Эмили… мир?»', act: () => { f.emilyCandy = true; g.popup('Эмили', '«Ладно… держи мою заначку». Она протягивает мешочек конфет.', '#ffa0ff', () => g.addItem('candy', 2), 'emily_2_ru'); } });
      opts.push(bye);
      if (offended) return d('Эмили', '#ffa0ff', '«Не разговариваю с любимчиком! Иди к своей маме!» (Шкала Любви сильно в сторону Бени — Эмили обиделась. Помоги ей или подожди.)', [bye]);
      return d('Эмили', '#ffa0ff', '«Мама меня больше любит!»', opts, { voice: 'emily_1_ru', foreign: he('אמא אוהבת אותי יותר!', 'Има охевет оти йотер!', 'Мама любит меня больше!') });
    }
    // ───────────────────────── друзья
    case 'ido': {
      const opts: DialogOpt[] = [];
      if (!f.friend_ido) opts.push({ label: '«Идо, пошли со мной?»', act: () => { befriend(g, 'ido'); g.popup('Идо', '«Я с тобой, брат». Идо будет носить лишние вещи: +5 мест в карманах.', '#60c0a0', undefined, 'ido_1_ru'); } });
      if (f.greatStarted && !f.gs_ido) opts.push({ label: '«Нужны доски для Великого Шалаша!»', act: () => gsGive(g, 'ido', 'Идо притащит доски. «Давай, я понесу».') });
      opts.push(bye);
      return d('Идо', '#60c0a0', f.friend_ido ? '«Давай, я понесу».' : '«Я с тобой, брат».', opts, { voice: f.friend_ido ? 'ido_2_ru' : 'ido_1_ru' });
    }
    case 'amir': {
      f.amirLaughs = (f.amirLaughs ?? 0) + g.rng.int(3, 9);
      g.hooks.sfx('amir_laugh');
      checkAmir(g);
      const opts: DialogOpt[] = [];
      if (!f.windowQuest) {
        return d('Амир', '#ffc060', '«Ха-ха-ха! Бени, спорим, ты не попадёшь камнем в окно этого ворчуна? Ха-ха! Гая говорит, ты струсишь!»\n\n(Квест «Окно и камень». Можно кинуть камень (T), глядя на окно соседа, — или отказаться.)', [
          { label: '«Спорим, попаду!» (взять камень и кинуть: встань напротив окна и нажми T)', act: () => { f.windowQuest = 'offered'; if (!g.hasItem('rock')) g.addItem('rock'); } },
          { label: '«Не буду. Он и так старый и грустный»', act: () => { f.windowQuest = 'refused'; g.stats.nagl = Math.max(0, g.stats.nagl - 0); f.rep = (f.rep ?? 0) - 1; g.popup('Амир', '«Ха-ха-ха! Трус! Ха-ха!» Гая кричит издалека: «Трусишка!» (−репутация у друзей). Но мама Нина обязательно узнает…', '#ffc060'); } },
        ], { voice: 'amir_1_ru' });
      }
      if (!f.friend_amir) opts.push({ label: '«Амир, будешь в моей банде?»', act: () => { befriend(g, 'amir'); g.popup('Амир', '«Ха-ха! Я их сейчас раздавлю! Кого? Не знаю! Ха-ха!» Амир — танк: в бою на 3-м ходу врывается на помощь.', '#ffc060', undefined, 'amir_2_ru'); } });
      if (f.greatStarted && !f.gs_amir) opts.push({ label: '«Нам нужна мебель для Великого Шалаша»', act: () => gsGive(g, 'amir', 'Амир тащит старый диван через весь мошав. Ржёт всю дорогу.') });
      opts.push(bye);
      return d('Амир', '#ffc060', `«Ха-ха-ха! Чё? Я не понял! Ха-ха!» (Амир ржал уже ${f.amirLaughs} раз)`, opts, { voice: 'amir_1_ru', foreign: he('חחח! מה? לא הבנתי! חחח!', 'Ха-ха-ха! Ма? Ло хевнати! Ха-ха!', 'Ха-ха! Что? Не понял! Ха-ха!') });
    }
    case 'gaya': {
      const opts: DialogOpt[] = [];
      if (!f.friend_gaya) {
        opts.push({ label: '«Привет, пацан!»', act: () => { f.gayaOffended = (f.gayaOffended ?? 0) + 1; g.popup('Гая', '«Я девочка, вообще-то!» (Гая обиделась. −отношения)', '#80e060', undefined, 'gaya_1_ru'); } });
        opts.push({ label: '«Гая, ты лучше всех лазаешь по деревьям. Научишь?»', act: () => {
          if ((f.gayaOffended ?? 0) >= 2) return g.popup('Гая', '«С тобой не дружу. Ты меня пацаном обозвал. Два раза!» (Принеси ей что-нибудь вкусное — арбуз.)', '#80e060');
          befriend(g, 'gaya');
          g.popup('Гая', '«Я первая на дереве!» Гая взлетает на эвкалипт и кричит сверху, что видит. Карта вокруг раскрыта. А ещё она нашла у вороньего гнезда странный ключ «Кошачья лапка».', '#80e060', () => { revealAround(g, 18); g.addItem('key_cats'); hintBurrow(g); }, 'gaya_2_ru');
        } });
        if ((f.gayaOffended ?? 0) >= 2 && g.hasItem('watermelon')) opts.push({ label: '(Подарить арбуз и извиниться)', act: () => { g.removeItem('watermelon'); f.gayaOffended = 0; g.popup('Гая', '«Ладно. Прощаю. Но больше так не говори».', '#80e060'); } });
      } else {
        opts.push({ label: '«Гая, посмотри с дерева, что вокруг»', act: () => { revealAround(g, 18); hintBurrow(g); } });
        if (f.greatStarted && !f.gs_gaya) opts.push({ label: '«Нужны верёвки для Великого Шалаша»', act: () => gsGive(g, 'gaya', 'Гая снимает верёвки с самых высоких веток.') });
      }
      opts.push(bye);
      return d('Гая', '#80e060', '«Я первая на дереве!»', opts, { foreign: he('אני ראשונה על העץ!', 'Ани ришона аль ха-эц!', 'Я первая на дереве!') });
    }
    case 'yonatan': {
      const opts: DialogOpt[] = [];
      opts.push({ label: '(Засмеяться над шуткой)', act: () => {
        f.yonJokes = (f.yonJokes ?? 0) + 1;
        if (f.yonJokes === 5) {
          g.popup('Йонатан', '«Ну смотри: Klopfsalat — это салат, который стучит. Klopf — стук! А Kopfsalat — это кочанный салат! Понимаешь? Klopf-Kopf!»\n\n…Шутка всё равно не смешная.', '#f0f040', () => g.achieve('joke', 'Немецкий юмор'), 'yonatan_3_ru');
        } else g.msg(`Бени смеётся из вежливости (${f.yonJokes}/5). Йонатан сияет.`, '#f0f040');
      } });
      if (!f.friend_yonatan) opts.push({ label: '«Йонатан, будешь бегать за подмогой?»', act: () => { befriend(g, 'yonatan'); g.popup('Йонатан', '«Я быстро! Я принесу!» Йонатан иногда будет приносить предметы. Иногда не те.', '#f0f040', undefined, 'yonatan_1_ru'); } });
      if (f.greatStarted && !f.gs_yonatan) opts.push({ label: '«Нам нужен флаг для Великого Шалаша!»', act: () => gsGive(g, 'yonatan', 'Йонатан приносит флаг. Почему-то флаг Германии.') });
      opts.push(bye);
      return d('Йонатан', '#f0f040', '«Was ist grün und klopft an die Tür? Ein Klopfsalat! Это очень смешная немецкая шутка!»', opts, { voice: 'yonatan_3_ru' });
    }
    case 'enbar': {
      const n = f.enbarTalks ?? 0;
      if (f.friend_enbar) {
        const opts: DialogOpt[] = [];
        if (f.greatStarted && !f.gs_enbar) opts.push({ label: '«Нужно одеяло для Великого Шалаша»', act: () => gsGive(g, 'enbar', 'Энбар молча приносит чёрное одеяло. «…Ну. Пойдём».') });
        opts.push(bye);
        return d('Энбар', '#9090a0', '«…Ну. Пойдём».', opts, { voice: 'enbar_1_ru' });
      }
      const lines = [
        '«…»\nЭнбар смотрит вдаль. Молчит.',
        '«…Ты знаешь, что все когда-нибудь уедут? Вырастут. Разъедутся».',
        '«…Лес закончится. Друзья разъедутся. А я буду помнить. Вот что меня расстраивает».',
      ];
      return d('Энбар', '#9090a0', lines[Math.min(n, 2)], [
        { label: '(Сесть рядом и помолчать)', act: () => {
          f.enbarTalks = n + 1;
          if (n + 1 >= 3) {
            befriend(g, 'enbar');
            g.popup('Энбар', '«Ты единственный, кто меня слушает».\n\nЭнбар достаёт из кармана гитарную струну. «Держи. Сыграй что-нибудь, чтобы не было так тихо». Перк «Холодная голова»: враги не видят Бени в тени.', '#9090a0', () => { giveString(g, 'str_enbar', 'от Энбара, за то, что выслушал'); g.givePerk('coldhead'); }, 'enbar_2_ru');
          } else g.msg('Вы сидите молча. Энбару, кажется, стало чуть легче.', '#9090a0');
        } },
        { label: '«Да ладно тебе, пошли играть!»', act: () => g.msg('Энбар отворачивается. «…Ну. Иди».', '#9090a0') },
      ], { voice: n === 0 ? 'enbar_1_ru' : undefined });
    }
    case 'yakut': {
      const opts: DialogOpt[] = [];
      opts.push({ label: '«Якут, откуда у тебя мамонтовое мясо?»', act: () => {
        const i = f.yakutStory ?? 0;
        f.yakutStory = i + 1;
        g.popup('Якут', `«${YAKUT_STORIES[i % 7]}» (версия ${(i % 7) + 1} из 7)`, '#ff5050', () => {
          if (i === 0) g.addItem('mammoth');
          if (i + 1 === 7) g.achieve('mammoth7', 'Семь версий мамонта');
        }, i === 0 ? 'yakut_2_ru' : undefined);
      } });
      if ((f.roofJumps ?? 0) < 3) opts.push({ label: '«Научи прыгать с крыши!»', act: () => g.popup('Якут', '«Залезай на крышу гаража (лесенка слева). Встань у края, повернись к матрасу (Shift+→) и прыгай (J). Прыгай, не бойся!»', '#ff5050', undefined, 'yakut_1_ru') });
      else if (!f.yakutKey) opts.push({ label: '«Я прыгнул три раза!»', act: () => { f.yakutKey = true; befriend(g, 'yakut'); g.popup('Якут', '«Уруй! Ты настоящий якут! Держи — это ключ «Бивень». Дед говорил, им открывается дорога туда, где мамонты». ', '#ff5050', () => g.addItem('key_frost'), 'yakut_3_ru'); } });
      if (!f.friend_yakut && (f.roofJumps ?? 0) < 3) opts.push({ label: '«Будешь моим лучшим другом?»', act: () => g.popup('Якут', '«Сначала прыгни с крыши три раза. Потом поговорим, кто чей лучший друг!»', '#ff5050') });
      if (!f.greatStarted && friendsCount(g) >= 2) opts.push({ label: '«Давай построим самый лучший шалаш в лесу!»', act: () => { f.greatStarted = true; g.popup('Якут', '«Великий Шалаш! Каждый что-то принесёт: Идо — доски, Амир — диван, Гая — верёвки, Йонатан — флаг, Энбар — одеяло, а я — шкуру мамонта! Потом все на большую поляну в лесу!»\n\nКвест «Великий Шалаш» начат.', '#ff5050', () => gsGive(g, 'yakut', 'Якут приносит шкуру. «Мамонтовая!»')); } });
      opts.push(bye);
      return d('Якут', '#ff5050', '«Уруй! Бени! Прыгнем сегодня с крыши?»', opts);
    }
    case 'iit':
      return d('Иит', '#a0d0ff', '«Привет, Бени! Ты куда?»', [
        { label: '«В лес, за железку!»', act: () => g.msg('«Осторожно на путях! Поезд раз в полтора часа».', '#a0d0ff') },
        { label: '«Ищу гитарные струны»', act: () => g.msg(`«Шесть струн? Одна точно у Эмили, одна на дне речки — Сомик сторожит. Ещё старшие ребята что-то прятали в шалаше. Найдено: ${stringsCount(g)}/6.»`, '#a0d0ff') },
        bye,
      ], { voice: 'iit_1_ru', foreign: he('היי בני! לאן אתה הולך?', 'Хай Бени! Леан ата холех?', 'Привет, Бени! Куда идёшь?') });
    case 'mila': {
      const opts: DialogOpt[] = [];
      if (g.hasItem('guitar') && !f.milaPlayed) opts.push({ label: '(Сыграть Миле «Рыжий рифф»)', act: () => { f.milaPlayed = true; g.stats.rock += 1; g.popup('Мила', 'Ми–Соль–Ля–Си. Мила улыбается. «Ещё!» (+1 Рок)', '#ffc0e0', () => g.addItem('memory_coin', 1)); } });
      opts.push(bye);
      return d('Мила', '#ffc0e0', '«Сыграешь мне на гитаре?»', opts, { voice: 'mila_1_ru' });
    }
    case 'neighbor': {
      if (f.mustApologize && !f.apologized) {
        return d('Ворчливый сосед', '#b0a080', '«Опять эти дети!» Сосед хмуро смотрит на Бени и папу за его спиной.', [
          { label: '«Простите меня. Это я разбил окно. Я помогу вставить новое»', act: () => {
            f.apologized = true;
            f.windowQuest = 'apologized';
            g.popup('Сосед', 'Сосед долго молчит. Потом вдруг улыбается. «В твоём возрасте я разбил окно синагоги. Знаешь что… держи. Я когда-то играл. Это мой старый медиатор».', '#b0a080', () => { g.addItem('pick'); g.addXp(15); });
          } },
          { label: '«Ну… извините, что ли»', act: () => g.popup('Сосед', '«Извините, что ли?! Иди-иди». (Папа качает головой. Попробуй ещё раз — искренне.)', '#b0a080') },
        ], { voice: 'neighbor_1_ru' });
      }
      if (f.apologized) return d('Сосед', '#b0a080', '«А, Бени! Заходи как-нибудь, сыграю тебе на мандолине».', [bye]);
      return d('Ворчливый сосед', '#b0a080', '«Опять эти дети!»', [bye], { voice: 'neighbor_1_ru', foreign: he('שוב הילדים האלה!', 'Шув ха-йеладим ха-эле!', 'Опять эти дети!') });
    }
    case 'teacher': {
      const opts: DialogOpt[] = [];
      if (!f.str_school) opts.push({ label: '«У вас не найдётся гитарной струны?»', act: () => g.popup('Учительница музыки', '«Для тебя, Бени? Найдётся. Только обещай играть громко — и не на уроке математики».', '#e0a0ff', () => giveString(g, 'str_school', 'в музыкальном классе')) });
      if (!f.lv_grade) opts.push({ label: '«Можно ответить на оценку?»', act: () => g.pushDialog(d('Учительница музыки', '#e0a0ff', '«Сколько струн у классической гитары?»', [
        { label: '4', act: () => g.msg('«Это бас-гитара, Бени». Двойка.', '#ff8080') },
        { label: '6', act: () => { f.lv_grade = true; g.stats.love += 6; g.popup('Учительница музыки', '«Отлично! Пятёрка». Будет что показать маме.', '#e0a0ff'); } },
        { label: '12', act: () => g.msg('«Бывает и такая, но не классическая». Тройка.', '#ffc080') },
      ])) });
      opts.push(bye);
      return d('Учительница музыки', '#e0a0ff', '«Бени! Опять без нот? Ну проходи».', opts);
    }
    case 'som': {
      if (a.data.dimension) {
        const opts: DialogOpt[] = [];
        if (!f.somDimTask) opts.push({ label: '«Сомик?! Ты умеешь говорить?»', act: () => { f.somDimTask = true; g.popup('Сомик', '«Буль… Здесь, внизу, все говорят. Принеси мне речную гальку с берега. Скучаю по дому…»', '#60a0a0'); } });
        if (f.somDimTask && g.hasItem('pebble') && !f.somDimDone) opts.push({ label: '(Отдать речную гальку)', act: () => { g.removeItem('pebble'); f.somDimDone = true; g.somMemory = Math.max(g.somMemory, 5); g.popup('Сомик', '«Буль… Пахнет домом. Запомни меня, Бени. Даже когда вырастешь». Перк «Друг сомика».', '#60a0a0', () => { g.givePerk('somfriend'); g.addItem('memory_coin', 2); }); } });
        opts.push(bye);
        return d('Сомик', '#60a0a0', '«Буль… Кто тревожит мою речку?»', opts, { voice: 'som_1_ru', foreign: he('בלוב… מי מפריע לנחל שלי?', 'Блуб… ми мафриа ла-нахаль шели?', 'Буль… кто мешает моему ручью?') });
      }
      if (!f.somMet) {
        f.somMet = true;
        g.somMemory = Math.max(g.somMemory, 3);
        return d('Сомик', '#60a0a0', 'Из мутной воды поднимается огромная усатая голова. Старый толстый сом смотрит прямо на Бени.\n«Буль… Кто тревожит мою речку?»', [{ label: '(Смотреть, раскрыв рот)' }], { voice: 'som_1_ru', foreign: he('בלוב… מי מפריע לנחל שלי?', 'Блуб… ми мафриа ла-нахаль шели?', 'Буль… кто мешает моему ручью?') });
      }
      return d('Сомик', '#60a0a0', 'Сомик лениво шевелит усами. Поймать его можно только на особую приманку… (Рыбалка на берегу.)', [bye]);
    }
    case 'settler':
      return d('Призрак первого поселенца', '#c0e0ff', '«Шалом, мальчик. В 1883 году мы пришли сюда — несколько семей из Литвы и Польши. Здесь был пустырь и малярийное болото. Барон Ротшильд помог нам и назвал посёлок в честь своей матери, Бетти: Мазкерет Батья — «Память о Батье». Мы сажали виноград и эвкалипты, чтобы осушить болота. Помни, что всё вокруг кто-то когда-то посадил».', [
        { label: '«Тода раба!» (Большое спасибо!)', act: () => { a.dead = true; g.map.actors = g.map.actors.filter((x) => x !== a); g.foundSecret('L1_settler', 'Призрак первого поселенца'); g.addXp(10); } },
      ]);
    case 'mammoth_ice':
      return d('Мамонт во льду', '#c0e0ff', 'Огромный мамонт, вмёрзший в лёд. У него не хватает кусочка на боку. Аккуратно так, будто отрезали ножиком.\n\n…Якут?!', [{ label: '(Уважительно поклониться)', act: () => g.achieve('mammoth_found', 'Он существует!') }]);
    case 'fan':
      return d('Фанат', '#ff80ff', g.rng.pick(['«БЕ-НИ! БЕ-НИ!»', '«Сыграй «Рыжий рифф»!»', '«Распишись на моей кепке!»']), [bye]);
    case 'jet':
      g.achieve('sky', 'Рядом с самолётом');
      return d('Реактивный самолёт', '#e0e0ff', 'Бени летит рядом с реактивным самолётом. Пилот в шлеме поворачивается и показывает большой палец вверх.', [bye]);
    case 'french1':
    case 'french2':
      if (f.frenchState === 'won') return d(a.name, a.color, '«Respect, Бени. Ты крутой». (Французы теперь нейтральны.)', [bye]);
      return null;
    default:
      if (a.tags.has('cat')) return null;
      return null;
  }
}

export function checkAmir(g: Game) {
  if ((g.flags.amirLaughs ?? 0) >= 100 && !g.achievements.has('laugh')) {
    g.achieve('laugh', 'Заразительный смех');
    for (const e of g.map.actors) if (e.faction === 'enemy') e.laugh = 1;
    g.msg('Амир ржёт в сотый раз. Все враги на этаже смеются и не атакуют!', '#ffc060');
  }
}

export function revealAround(g: Game, r: number) {
  const m = g.map;
  const p = g.player;
  for (let y = p.y - r; y <= p.y + r; y++) for (let x = p.x - r; x <= p.x + r; x++) if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.explored[y * m.w + x] = 1;
  g.msg('Гая с дерева: «Вижу всё вокруг!» Карта рядом раскрыта.', '#80e060');
}

export function hintBurrow(g: Game) {
  const b = g.map.secrets.find((s) => s.kind === 'burrow' && !s.revealed);
  if (b) g.msg('Гая: «Там что-то есть…» — и показывает пальцем.', '#80e060');
  if (b) g.fx.push({ kind: 'spark', x: b.x, y: b.y, color: '#ffffff', ttl: 30, max: 30 });
}

export { ITEMS };
