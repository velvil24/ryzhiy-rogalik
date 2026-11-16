// Уровень 1 «Маскерет-Батья: лес за железной дорогой» — сценарий, квесты, события, боссы.
import type { Game } from '../../engine/game';
import type { LevelModule } from '../registry';
import type { Actor, Prop } from '../../engine/types';
import { getTile, setTile, DIRS8 } from '../../engine/types';
import { Rng } from '../../engine/rng';
import { makeActor } from '../../entities/actors';
import { buildBase, buildBossArena, buildForest, buildRiver, buildSchool, buildYard } from './maps';
import { dimCats, dimFrost, dimRock, dimRogue, dimSky, dimSom, secretRoom } from '../dimensions';
import { talkL1, checkAmir } from './talk';
import { FRIENDS, FRIEND_NAMES, GINGERS, friendsCount, giveString, loveTasksDone, questLog, startDinner, stringsCount, gsGive } from './quests';
import { flood } from '../../engine/gen';

function inRect(x: number, y: number, r?: number[]) {
  return !!r && x > r[0] && y > r[1] && x < r[0] + r[2] - 1 && y < r[1] + r[3] - 1;
}

const STRANGE_REWARDS = ['watermelon', 'cassette', 'mammoth', 'pita'];

export const level1: LevelModule & { quests: typeof questLog } = {
  num: 1,
  name: 'Маскерет-Батья: лес за железной дорогой',
  stage: 'Детство в Израиле',
  intro: [
    '«Тогда казалось, что лес за железной дорогой — бесконечный, а лето никогда не закончится».',
    'Маскерет-Батья. Жаркое солнце, запах эвкалиптов и апельсиновых садов, белые дома с красными крышами. Над головой с рёвом проносятся реактивные самолёты с соседней базы.',
    'У Бени есть гитара — но на ней нет ни одной струны. Найди шесть струн, подружись с котами и друзьями, а ночью… ночью на путях что-то гудит.',
  ],
  quests: questLog,

  build(g: Game) {
    const rng = new Rng(g.seed);
    g.maps.yard = buildYard(g, rng);
    g.maps.forest = buildForest(g, rng);
    g.maps.river = buildRiver(g, rng);
    g.maps.base = buildBase(g, rng);
    g.maps.school = buildSchool(g, rng);
    g.maps.boss = buildBossArena();
    // тайники
    g.maps.sec_yardpipe = secretRoom('sec_yardpipe', 'Тайник под водостоком', rng, 'drain', [['key_rogue', 1], ['memory_coin', 2], ['bamba', 2]]);
    g.maps.sec_drain = secretRoom('sec_drain', 'Дренаж под железной дорогой', rng, 'drain', [['mammoth', 1], ['memory_coin', 2]], ['mosquito', 'mosquito']);
    g.maps.sec_cave = secretRoom('sec_cave', 'Старая пещера', rng, 'cave', [['key_som', 1], ['memory_coin', 3], ['rock', 3]], ['scorpion', 'scorpion']);
    g.maps.sec_bunker = secretRoom('sec_bunker', 'Заброшенный бункер', rng, 'bunker', [['key_sky', 1], ['memory_coin', 2], ['flashlight', 1]]);
    g.maps.sec_beni = secretRoom('sec_beni', 'Тайная комната за стеной школы', rng, 'room', [['key_rock', 1], ['memory_coin', 3], ['cassette', 1]]);
    g.maps.sec_air = secretRoom('sec_air', 'Комната в небе над гаражом', rng, 'sky', [['memory_coin', 4], ['mammoth', 1], ['cap', 1]]);
    const sb = g.maps.sec_beni;
    setTile(sb, 10, 1, 'sign');
    sb.signs.push({ x: 10, y: 1, he: 'בני היה כאן', tr: 'Бени хая кан', ru: 'Здесь был Бени', lang: 'he', note: 'Тайная надпись на стене школы, нацарапанная гвоздём. Кажется, почерк Бени… но он её ещё не писал?' });
    // измерения
    g.maps.dim_cats = dimCats(rng);
    g.maps.dim_som = dimSom(rng);
    g.maps.dim_frost = dimFrost(rng);
    g.maps.dim_rock = dimRock(rng);
    g.maps.dim_sky = dimSky(rng);
    g.maps.dim_rogue = dimRogue(rng);
    // бонусы Альбома
    const y = g.maps.yard;
    if (g.album.unlocks.startGuitar) {
      g.addItem('guitar', 1, true);
      g.msg('Из Альбома: Бени начинает с гитарой (пока без всех струн).', '#ffe0a0');
    }
    if (g.album.unlocks.startCat) {
      const h = y.actors.find((a) => a.data.catId === 'hummus');
      if (h) {
        h.faction = 'ally';
        h.ai = 'companion';
        h.data.follow = true;
        h.x = y.start.x + 1;
        h.y = y.start.y;
        g.flags.gingers = ['hummus'];
        g.flags.chordG = true;
        g.player.maxHp += 5;
        g.player.hp += 5;
      }
    }
    if (g.album.kingFollows) {
      const k = makeActor('cat_king', y.start.x - 1, y.start.y);
      k.faction = 'ally';
      k.ai = 'companion';
      k.data.follow = true;
      y.actors.push(k);
      g.flags.chordG = true;
    }
    if (g.album.unlocks.secretZones) {
      const s = y.secrets.find((q) => q.kind === 'pipe');
      if (s) y.flags.eyeMark = { x: s.x, y: s.y };
    }
    return { startMap: 'yard' };
  },

  talk: talkL1,

  prop(g: Game, p: Prop): boolean {
    const f = g.flags;
    switch (p.id) {
      case 'stove':
        if (!f.lv_dishes && f.loveStarted) {
          f.lv_dishes = true;
          g.stats.love += 6;
          g.popup('Посуда', 'Бени моет гору тарелок. Мама заглядывает на кухню и не верит своим глазам. (+Любовь)', '#ff90b0');
          return true;
        }
        g.msg('Мамина плита. Пахнет котлетами.', '#ff8040');
        return false;
      case 'table':
        if (!f.cardDrawn) {
          f.cardDrawn = true;
          g.addItem('card');
          g.msg('Бени рисует открытку: мама, папа, Эмили, Бени и рыжий кот. Кот получился лучше всех.', '#ff80a0');
          return true;
        }
        g.msg('Стол. На нём крошки от бамбы.', '#c09060');
        return false;
      case 'dinner':
        if (loveTasksDone(g) >= 3 && !f.dinnerDone) {
          startDinner(g);
          return true;
        }
        g.msg(f.dinnerDone ? 'Здесь был лучший ужин.' : `Ужин будет, когда наберётся три добрых дела (${loveTasksDone(g)}/3). Начни с разговора с мамой.`, '#c09060');
        return false;
      case 'guitar_wall': {
        const n = stringsCount(g);
        if (f.guitar) {
          g.msg('Крючок, на котором висела гитара. Теперь она всегда с Бени.', '#ff8030');
          return false;
        }
        if (n >= 6) {
          f.guitar = true;
          g.removeItem('string', 6);
          if (!g.hasItem('guitar')) g.addItem('guitar', 1, true);
          g.stats.rock += 3;
          g.stats.drive = g.stats.maxDrive;
          g.map.flags.musicOverride = undefined;
          g.hooks.music('first_riff');
          g.fx.push({ kind: 'flash', color: '#ff8030', ttl: 20, max: 20 });
          g.pushDialog({
            who: '🎸 Первая струна',
            color: '#ff8030',
            text: 'Шесть струн. Бени натягивает их одну за другой, подкручивает колки… и берёт первый аккорд.\n\nМи–Соль–Ля–Си. «Рыжий рифф».\n\n«Это мой рифф!»\n\nГитара + аккорды E и A. Рок +3. (G — гитара.)',
            options: [{ label: 'Играть!', act: () => { g.addXp(30); g.achieve('first_riff', 'Первый рифф'); } }],
            voice: 'beni_2_ru',
            foreign: { orig: 'זה הריף שלי!', tr: 'Зе ха-риф шели!', ru: 'Это мой рифф!', rtl: true },
          });
          return true;
        }
        g.msg(`Гитара висит на стене без струн. Найдено струн: ${n}/6. (Q — журнал квестов)`, '#ff8030');
        return false;
      }
      case 'bed':
        if (g.isNight()) {
          const rest = 400 - (g.turn % 400);
          g.turn += rest - 1;
          g.player.hp = g.player.maxHp;
          g.stats.hunger = Math.max(10, g.stats.hunger - 20);
          g.msg('Бени засыпает под стрекот сверчков. Утро! Здоровье восстановлено.', '#c0c0ff');
          return true;
        }
        g.msg('Спать ещё рано. Мама скажет: «Иди погуляй, только не на пути!»', '#c0c0ff');
        return false;
      case 'car':
        f.carPeeks = (f.carPeeks ?? 0) + 1;
        if (f.carPeeks === 10) {
          g.popup('Записка', 'Под машиной приклеена папина записка: «Бени, хватит лазить под машину».', '#80b0ff', () => g.foundSecret('L1_car_note', 'Папина записка под машиной'), 'vova_2_ru');
        } else g.msg(`Бени заглядывает под машину (${f.carPeeks}). Масло, гайка, паук.`, '#4080c0');
        return true;
      case 'bike':
        g.msg(f.str_vova ? 'Велосипед как новенький!' : 'Сломанный велосипед. Папа поможет починить, если найти его ключ на 10.', '#c0c0c0');
        return false;
      case 'mattress':
        g.msg('Старый матрас. Сюда прыгают с крыши гаража.', '#e0d0f0');
        return false;
      case 'nest':
        g.msg('Осиное гнездо. Лучше не трогать… или попасть в него камнем? (T)', '#ffd020');
        return false;
      case 'nwindow':
        g.msg('Окно ворчливого соседа. Из-за занавески торчит усатое лицо.', '#a0e0ff');
        return false;
      case 'crossing':
        if (g.hasItem('guitar') && g.isNight() && !f.bossDone) {
          g.pushDialog({
            who: 'Переезд',
            color: '#a080ff',
            text: 'Ночь. На путях загораются два огромных фонаря. Гудок — длинный, призрачный. По рельсам несётся поезд, которого нет ни в одном расписании…\n\n«Железный Грохот» — символ всех детских страхов.',
            options: [
              { label: 'Выйти навстречу с гитарой', act: () => startBoss(g) },
              { label: 'Не сейчас' },
            ],
          });
          return false;
        }
        g.msg(g.hasItem('guitar') ? 'Переезд. Днём здесь тихо. Говорят, ночью тут ходит поезд-призрак…' : 'Переезд. «Стой! Железная дорога!»', '#c0b0a0');
        return false;
      case 'elder_shalash':
        if (!f.str_elder) {
          g.pushDialog({
            who: 'Шалаш старших ребят',
            color: '#d0a060',
            text: 'Внутри: старые журналы, пачка сигарет, гитарная струна в жестяной банке и кассета без подписи.',
            options: [
              { label: 'Взять только струну', act: () => giveString(g, 'str_elder', 'в шалаше старших ребят') },
              { label: 'Взять струну… и полистать журналы', act: () => { giveString(g, 'str_elder', 'в шалаше старших ребят'); g.stats.love -= 5; g.stats.nagl += 1; g.popup('Мама Нина (в голове)', '«Бени, не трогай, мама узнает!» Мама, конечно, узнала. (−Любовь, +Наглость)', '#ff90b0'); } },
            ],
          });
          return true;
        }
        g.msg('Шалаш старших ребят. Пусто.', '#d0a060');
        return false;
      case 'site':
      case 'great_site':
        return buildShalash(g, p);
      case 'shalash':
        return restShalash(g, p);
      case 'fishing':
        return fishing(g);
      case 'dive':
        if (getTile(g.map, g.player.x, g.player.y) !== 'deep' || g.dist(g.player, p) > 0) {
          g.msg('Сюда надо нырнуть: встань в глубокую воду у Сомика и нажми Пробел.', '#60c0ff');
          return false;
        }
        if (!f.str_river) {
          g.breath -= 4;
          g.popup('На дне', 'Бени ныряет. Мутно, холодно… Рядом шевелится огромный ус Сомика. Пальцы нащупывают что-то тонкое и звенящее — гитарная струна!', '#60c0ff', () => giveString(g, 'str_river', 'на дне речки, рядом с Сомиком'));
          return true;
        }
        g.msg('На дне только ил и пустые банки.', '#60c0ff');
        return true;
      case 'hill':
        return waitTakeoff(g);
      case 'piano':
        g.msg('Бени бренчит «Собачий вальс». Учительница морщится.', '#f0f0f0');
        return true;
      case 'stall': {
        const fr = g.map.actors.filter((a) => a.tags.has('french') && a.faction === 'enemy' && g.dist(a, p) <= 1);
        g.hooks.sfx('stall_door');
        if (fr.length) {
          for (const a of fr) {
            g.damage(a, 4, g.player);
            a.stun = 1;
          }
          g.msg('БАМ! Дверь кабинки прилетает французу в лоб!', '#8090a0');
        } else g.msg('Бени хлопает дверью кабинки.', '#8090a0');
        return true;
      }
      case 'throne':
        g.hooks.sfx('king_meow');
        g.achieve('throne', 'Посидел на кошачьем троне');
        g.msg('Бени садится на кошачий трон. Гигантские коты одобрительно мурлычут.', '#ffb020');
        return true;
      case 'rock_stage':
        return rockChallenge(g);
      case 'amulet':
        if (!f.amulet) {
          f.amulet = true;
          g.addXp(60);
          g.achieve('rogue', 'Пасхалка жанру: почти Амулет Йендора');
          g.popup('Перевёрнутый мир', 'Здесь всё как в самой первой игре — буквы, тишина и кобольды. На постаменте — «Амулет Йендора». Почти. На табличке: «Копия. Оригинал — в Rogue, 1980».', '#ffffff');
          return true;
        }
        g.msg('Пустой постамент.', '#ffffff');
        return false;
    }
    g.msg(p.name, '#c0c0c0');
    return false;
  },

  onEnterMap(g, m) {
    const f = g.flags;
    if (m.id === 'yard' && !f.introYard) {
      f.introYard = true;
      g.msg('Дом и двор. Стрелки/WASD — ходить, Пробел — действие, G — гитара, I — вещи, Q — квесты, ? — помощь.', '#ffe9a0');
      g.hooks.voice('beni_1_ru');
    }
    if (m.id === 'school' && !f.schoolIntro) {
      f.schoolIntro = true;
      g.msg('Школа. Звенит звонок. Охранник ловит тех, кто не на уроке…', '#e0e0ff');
      g.hooks.sfx('school_bell');
    }
    if (m.id === 'base' && !f.baseIntro) {
      f.baseIntro = true;
      g.msg('Военная база. Сюда нельзя, но… очень хочется. Патрули видят на 5 клеток. С холма видно взлётную полосу.', '#c0c0a0');
    }
    if (m.id === 'river' && f.somKept) m.flags.musicOverride = 'level1_night';
    if (m.isDimension) g.msg('Внутри измерения время мира не идёт, а голод — в два раза медленнее. Выход (>) — там, где вошёл.', '#c0a0ff');
  },

  onTurn(g) {
    const f = g.flags;
    const m = g.map;
    const p = g.player;
    // Рыжие и странные коты, Феникс приходит только ночью
    for (const a of m.actors) {
      if (a.data.nightOnly && a.faction !== 'ally') a.data.hidden = !g.isNight();
    }
    // поезд по расписанию (Зона 1)
    if (m.id === 'yard') {
      const t = g.turn % 90;
      if (t === 84) {
        g.msg('Вдалеке гудит поезд! Уходи с рельсов!', '#ffb060');
        g.hooks.sfx('train_approach');
      }
      if (t >= 87 && t <= 88) {
        g.fx.push({ kind: 'train', x: 63, ttl: 6, max: 6 });
        for (const a of [...m.actors]) {
          if (m.flags.railX.includes(a.x)) {
            g.damage(a, 8, null, 'Поезд');
            if (!a.dead) a.x = 61;
          }
        }
      }
      // призрак первого поселенца у вывески
      const ts = m.flags.townSign;
      if (ts && g.dist(p, ts) <= 1 && !f.settlerShown) {
        f.signStand = (f.signStand ?? 0) + 1;
        if (f.signStand >= 6) {
          f.settlerShown = true;
          const s = g.freeNear(ts.x, ts.y);
          if (s) {
            g.spawn('settler', s.x, s.y);
            g.msg('Воздух дрожит… перед вывеской появляется полупрозрачный старик в шляпе.', '#c0e0ff');
          }
        }
      } else f.signStand = 0;
      // Рыжий Король
      if ((f.gingers ?? []).length >= 5 && !f.kingSpawned) {
        f.kingSpawned = true;
        const k = g.spawn('cat_king', 28, 5);
        k.data.home = { x: 28, y: 5 };
        g.hooks.sfx('king_meow');
        g.popup('Рыжая армия', 'Все пять рыжих котов мошава собрались вместе. С крыши гаража медленно и величественно спускается огромный кот — Рыжий Король. Погладь его, и он станет постоянным спутником Бени!', '#ff7000');
      }
    }
    // реактивные самолёты
    if (!m.isDimension && m.light === 'outdoor' && g.turn % 70 === 35) {
      g.fx.push({ kind: 'jet', ttl: 30, max: 30 });
      g.fx.push({ kind: 'shake', ttl: 14, max: 14 });
      g.hooks.sfx('jet_flyby');
      g.msg('Над головой с рёвом проносится реактивный самолёт! Все задирают головы.', '#e0e0ff');
    }
    // Эмили делает свои ходы
    if (g.turn % 70 === 0 && f.loveStarted && !f.dinnerDone) {
      g.stats.love -= 5;
      g.msg(g.rng.pick(['Эмили нарисовала маме открытку.', 'Эмили получила пятёрку.', 'Эмили помогла папе в гараже.']) + ' (Любовь сдвигается к Эмили)', '#ffa0ff');
    }
    g.stats.love = Math.max(0, Math.min(100, g.stats.love));
    // ночь в лесу — шакалы
    if (m.id === 'forest' && g.isNight() && g.turn % 25 === 0 && m.actors.filter((a) => a.kind === 'jackal').length < 3) {
      const rng = g.rng;
      for (let i = 0; i < 20; i++) {
        const x = rng.int(2, m.w - 3), y = rng.int(2, m.h - 3);
        if (g.isWalkable(x, y) && !g.canSee(x, y) && !g.actorAt(x, y)) {
          g.spawn('jackal', x, y);
          g.hooks.sfx('jackal');
          g.msg('Где-то воют шакалы…', '#c0a070');
          break;
        }
      }
    }
    // школьный звонок
    if (m.id === 'school' && g.turn % 60 === 0) {
      g.hooks.sfx('school_bell');
      g.msg('Звонок! Перемена.', '#e0e0ff');
    }
    // Йонатан приносит предметы
    if (f.friend_yonatan && g.turn % 120 === 60) {
      const it = g.rng.pick(['bamba', 'rock', 'pita', 'branches', 'cardboard', 'rope']);
      g.addItem(it);
      g.msg('Йонатан прибегает: «Я принёс!» …Ну, хоть что-то.', '#f0f040');
    }
    // Амир ржёт где-то рядом
    if (f.friend_amir && g.rng.chance(0.02)) {
      f.amirLaughs = (f.amirLaughs ?? 0) + 1;
      checkAmir(g);
    }
    // мини-босс: двое в туалете
    if (m.id === 'school') {
      const r = m.flags.wcRoom;
      if (inRect(p.x, p.y, r) && !f.frenchState) startFrench(g);
      if (f.frenchState === 'fight') {
        f.frenchTurn = (f.frenchTurn ?? 0) + 1;
        if (f.frenchTurn === 3) {
          for (const who of ['amir', 'yakut']) {
            if (!f['friend_' + who]) continue;
            const s = g.freeNear(p.x, p.y);
            if (!s) continue;
            const a = g.spawn(who, s.x, s.y);
            a.faction = 'ally';
            a.ai = 'companion';
            a.tags.delete('npc');
            a.data.tempHelper = true;
            g.say(a, who === 'amir' ? 'Я их раздавлю! Ха-ха!' : 'Уруй!');
            g.msg(`${FRIEND_NAMES[who]} врывается в туалет на помощь!`, '#ffd060');
          }
        }
      }
    }
    // босс
    if (m.id === 'boss') bossTurn(g);
  },

  onDefeat(g, a) {
    const f = g.flags;
    if (a.tags.has('french')) {
      a.hp = 1;
      a.faction = 'neutral';
      a.ai = 'still';
      g.say(a, 'Respect…', 8);
      g.msg(`${a.name} сдаётся: «D'accord, d'accord!»`, a.color);
      const left = g.map.actors.filter((x) => x.tags.has('french') && x.faction === 'enemy');
      if (!left.length) {
        f.frenchState = 'won';
        g.addXp(50);
        g.hooks.voice('beni_4_ru');
        g.map.flags.musicOverride = undefined;
        for (const h of g.map.actors.filter((x) => x.data.tempHelper)) {
          h.dead = true;
        }
        g.map.actors = g.map.actors.filter((x) => !x.dead);
        g.popup('Двое в туалете', '«Я сильнее вас двоих!»\n\nФранцузы переглядываются. «Respect, Бени». Теперь они уважают его — может, когда-нибудь станут союзниками.', '#4080ff', () => g.achieve('french', 'Двое в туалете'));
      }
      return true;
    }
    return false;
  },

  onPlayerDown(g) {
    const f = g.flags;
    if (f.frenchState === 'fight') {
      f.frenchState = 'lost';
      g.player.maxHp = Math.max(5, g.player.maxHp - 2);
      g.player.hp = Math.ceil(g.player.maxHp / 2);
      for (const a of g.map.actors.filter((x) => x.tags.has('french'))) a.dead = true;
      g.map.actors = g.map.actors.filter((x) => !x.dead || x === g.player);
      g.map.flags.musicOverride = undefined;
      const pr = g.map.flags.principal;
      g.player.x = pr.x;
      g.player.y = pr.y;
      g.popup('Синяк', 'Французы ржут и убегают. У Бени под глазом синяк (−2 к здоровью до конца забега) и вызов к директору.\n\nДиректор: «Опять ты, Бени? …Ладно, иди. И умойся». (Можно попробовать снова позже.)', '#ff8080', () => { setTimeout(() => { f.frenchState = undefined; }, 0); });
      return true;
    }
    return false;
  },

  onCatFriend(g, c) {
    const f = g.flags;
    const id = c.data.catId;
    if (!id) return;
    f.gingers = f.gingers ?? [];
    if (f.gingers.includes(id)) return;
    f.gingers.push(id);
    f.chordG = true;
    g.hooks.voice('beni_5_ru');
    const info = GINGERS[id];
    if (id === 'apelsin') f.luck = true;
    if (id === 'shekel') f.autoPickup = true;
    if (id === 'captain') f.nightVision = true;
    if (id === 'hummus') {
      g.player.maxHp += 5;
      g.player.hp += 5;
    }
    if (id === 'phoenix') g.stats.str += 1;
    g.msg(`Рыжий кот ${info.name} — бонус: ${info.bonus}. Рыжая армия: ${f.gingers.length}/5. Аккорд G открыт!`, '#ff8c1a');
    g.addXp(6);
  },

  onStrangeCat(g, c) {
    const f = g.flags;
    f.strange = f.strange ?? [];
    f.strange.push(c.data.strangeId);
    if (!g.album.strangeCats.includes(c.data.strangeId)) g.album.strangeCats.push(c.data.strangeId);
    const item = STRANGE_REWARDS[(f.strange.length - 1) % STRANGE_REWARDS.length];
    g.msg(`${c.name}: «${c.data.sound === 'bark' ? 'Гав!' : 'Ква!'}» — и отдаёт подарок.`, c.color);
    g.addItem(item);
    g.foundSecret('L1_strange_' + c.data.strangeId, 'Странный кот: ' + c.name);
    if (f.strange.length >= 4) {
      g.player.maxHp += 5;
      g.player.hp += 5;
      g.addItem('memory_coin', 3);
      g.achieve('strange4', 'Все странные коты Маскерет-Батьи');
      g.msg('Награда мира: +5 к здоровью и 3 Воспоминания!', '#ffd060');
    }
  },

  onThrowHit(g, p) {
    const f = g.flags;
    if (p.id === 'nest') {
      g.hooks.sfx('bees');
      for (let i = 0; i < 4; i++) {
        const s = g.freeNear(p.x, p.y);
        if (s) g.spawn('wasp', s.x, s.y);
      }
      if (!f.windowQuest || f.windowQuest === 'offered') {
        f.windowQuest = 'bees';
        g.popup('Пчелиный рой!', 'Камень попадает точно в осиное гнездо. Хаос! Все разбегаются, сосед в халате прыгает по двору, Амир ржёт так, что падает в бугенвиллию.\n\nПасхалка «Пчелиный рой».', '#ffd020', () => g.foundSecret('L1_bees', 'Пчелиный рой'));
      }
      return true;
    }
    if (p.id === 'nwindow') {
      if (getTile(g.map, p.x, p.y) === 'window') {
        setTile(g.map, p.x, p.y, 'broken');
        g.hooks.sfx('glass_break');
        if (!f.windowQuest || f.windowQuest === 'offered') {
          f.windowQuest = 'broken';
          g.stats.nagl += 1;
          f.rep = (f.rep ?? 0) + 1;
          g.hooks.voice('neighbor_1_ru');
          g.popup('Дзынь!', 'Окно вдребезги! «Опять эти дети!» — орёт сосед. Все убегают. +Наглость, +репутация у друзей.\n\nНо вечером будет разговор с папой Вовой…', '#a0e0ff');
        }
      }
      return true;
    }
    return false;
  },

  onJump(g, fx, fy, tx, ty, fromRoof) {
    const f = g.flags;
    if (!fromRoof || g.mapId !== 'yard') return false;
    const onMattress = getTile(g.map, tx, ty) === 'mattress' || (Math.abs(tx - 34) <= 1 && ty === 5);
    g.hooks.sfx('jump_roof');
    if (!onMattress) {
      g.player.x = tx;
      g.player.y = ty;
      g.damage(g.player, 3, null, 'Неудачное приземление');
      g.msg('Мимо матраса! Ой… Якут подбегает: «Ешь мамонта, всё пройдёт!»', '#ff8080');
      if (!g.hasItem('mammoth')) g.addItem('mammoth');
      return true;
    }
    const chance = 0.5 + g.stats.jump * 0.1;
    g.player.x = 34;
    g.player.y = 5;
    if (g.rng.chance(chance)) {
      f.roofJumps = (f.roofJumps ?? 0) + 1;
      g.stats.jump += f.roofJumps <= 1 ? 2 : 0;
      g.hooks.voice('yakut_3_ru');
      g.msg(`Прыжок! Пружины матраса скрипят. Якут кричит «Уруй!» и обнимает Бени. (${f.roofJumps}/3)${f.roofJumps === 1 ? ' Прыгучесть +2!' : ''}`, '#a0ffa0');
      if (f.roofJumps === 3) {
        g.popup('С крыши видно…', 'После третьего прыжка Бени замечает с крыши то, чего не видно с земли: над матрасом, в воздухе, что-то мерцает — будто невидимая дверь. Прыгни туда (с крыши, ещё дальше матраса)!', '#e0e0ff');
        g.map.flags.airHint = true;
      }
    } else {
      g.damage(g.player, 2, null, 'Жёсткое приземление');
      g.msg('Неудача — приземление на край. Якут даёт мамонтовое мясо: «Всё прошло!»', '#ffb080');
      if (!g.hasItem('mammoth')) g.addItem('mammoth');
    }
    return true;
  },

  onLoud(g) {
    if (g.mapId === 'yard') {
      g.hooks.voice('neighbor_1_ru');
      g.msg('Сосед в окне: «Опять эти дети!» Собаки заливаются лаем.', '#b0a080');
    }
  },

  onCaught(g, a) {
    const gap = g.map.flags.gap;
    g.player.x = gap.x - 1;
    g.player.y = gap.y;
    g.stats.nagl = Math.max(0, g.stats.nagl - 0);
    g.popup('Патруль', `«${a.data.sayLine}» Солдат за шиворот выводит Бени за забор. «Беги домой, пацан». (Патрули видят на 5 клеток — ночью и в кустах прятаться проще.)`, '#708050');
  },

  canExit(g, to) {
    return null;
  },

  chordBonus(g) {
    return g.mapId === 'boss' ? friendsCount(g) + (g.flags.greatBuilt ? 2 : 0) : 0;
  },

  ai(g, a) {
    if (a.ai === 'boss_train') {
      const bs = g.flags.bossState;
      if (!bs) return true;
      if (g.dist(a, g.player) === 1 && g.rng.chance(0.5)) g.attack(a, g.player);
      return true;
    }
    return false;
  },

  onKill(g, a) {
    if (a.data.stolen) g.dropItemAt(a.data.stolen, a.x, a.y);
    if (a.kind === 'train_boss') bossWin(g);
  },

  onLevelExit(g) {
    g.startLevel(2);
  },

  keyPoints(g) {
    const pts: Record<string, { x: number; y: number; what: string }[]> = {};
    for (const id of ['yard', 'forest', 'river', 'base', 'school']) {
      const m = g.maps[id];
      pts[id] = [
        ...m.exits.map((e) => ({ x: e.x, y: e.y, what: 'выход → ' + e.to })),
        ...m.actors.filter((a) => a.tags.has('npc') && a.ai !== 'som').map((a) => ({ x: a.x, y: a.y, what: a.name })),
        ...m.props.filter((p) => p.id !== 'dive').map((p) => ({ x: p.x, y: p.y, what: p.name })),
      ];
    }
    return pts;
  },
};

// ───────────────────────────────────────── шалаши
function buildShalash(g: Game, p: Prop): boolean {
  const f = g.flags;
  if (p.id === 'great_site') {
    const all = FRIENDS.every((x) => f['gs_' + x]);
    if (f.greatBuilt) return restShalash(g, p);
    if (!all) {
      g.msg(f.greatStarted ? `Для Великого Шалаша не хватает материалов (${FRIENDS.filter((x) => f['gs_' + x]).length}/6).` : 'Большая поляна. Здесь можно построить Великий Шалаш — поговори с Якутом.', '#d0a060');
      return false;
    }
    f.greatBuilt = true;
    setTile(g.map, p.x, p.y, 'shalash');
    p.id = 'shalash';
    p.name = 'Великий Шалаш';
    g.hooks.sfx('build_shalash');
    g.popup('Великий Шалаш', 'Доски Идо, диван Амира, верёвки Гаи, флаг Германии от Йонатана, чёрное одеяло Энбара и «мамонтовая» шкура Якута. Получилось нелепо и прекрасно. Бени вешает рок-постер.\n\nТеперь это постоянная база в лесу. Ночью здесь — «Страшилки у костра».', '#d0a060', () => { g.addXp(40); g.achieve('great', 'Великий Шалаш'); });
    const t = g.map;
    setTile(t, p.x + 1, p.y - 1, 'poster');
    return true;
  }
  const site = p;
  const need = ['branches', 'cardboard', 'blanket', 'rope'];
  const missing = need.filter((i) => !g.hasItem(i));
  if (missing.length) {
    g.msg(`Для шалаша нужны: ветки, картон, старое одеяло и верёвка. Не хватает: ${missing.map((i) => ({ branches: 'ветки', cardboard: 'картон', blanket: 'одеяло', rope: 'верёвка' } as any)[i]).join(', ')}.`, '#d0a060');
    return false;
  }
  for (const i of need) g.removeItem(i);
  setTile(g.map, site.x, site.y, 'shalash');
  site.id = 'shalash';
  site.name = 'шалаш Бени (отдохнуть)';
  g.hooks.sfx('build_shalash');
  const turns = g.perks.has('shalash') ? 1 : 5;
  for (let i = 1; i < turns; i++) g.endTurn();
  g.msg(`Шалаш построен${turns === 1 ? ' за один ход' : ''}! Здесь можно отдохнуть (Пробел).`, '#d0a060');
  g.addXp(10);
  return true;
}

function restShalash(g: Game, p: Prop): boolean {
  const f = g.flags;
  const key = 'rest_' + p.x + '_' + p.y;
  if ((g.map.flags[key] ?? -999) > g.turn - 60) {
    g.msg('Отдыхали недавно. Шалаш не убежит.', '#d0a060');
    return false;
  }
  g.map.flags[key] = g.turn;
  const pct = g.perks.has('shalash') ? 0.5 : 0.3;
  g.heal(g.player, Math.ceil(g.player.maxHp * pct));
  for (let i = 0; i < 4; i++) g.endTurn();
  if (p.name === 'Великий Шалаш' && g.isNight()) {
    g.popup('Страшилки у костра', 'Все друзья у костра. Якут рассказывает про мамонта-оборотня, Энбар — про поезд, который увозит детство, Амир ржёт в самых страшных местах, Гая делает вид, что ей не страшно, Йонатан не понимает, где смеяться, а Идо просто рядом.\n\nПолное лечение. Друзья в бою с «Железным Грохотом» будут сильнее.', '#ff9030', () => { g.player.hp = g.player.maxHp; f.campfire = true; g.foundSecret('L1_campfire', 'Страшилки у костра'); });
    return true;
  }
  const ev = g.rng.int(0, 4);
  const texts = [
    'Бени отдыхает в шалаше. Где-то ухает сова.',
    'В шалаш заглядывает кот, сворачивается клубком у ноги. Тепло.',
    'Бени находит в углу забытую кем-то бамбу!',
    'Снаружи шуршат шакалы. Бени не высовывается.',
    'Бени задрёмывает, и ему снится поезд. Он просыпается, и сердце колотится.',
  ];
  g.msg(texts[ev] + ` (+${Math.round(pct * 100)}% здоровья)`, '#d0a060');
  if (ev === 2) g.addItem('bamba');
  return true;
}

// ───────────────────────────────────────── рыбалка и Сомик
function fishing(g: Game): boolean {
  const f = g.flags;
  for (let i = 0; i < 2; i++) g.endTurn();
  g.hooks.sfx('fishing');
  g.map.flags.ripple = g.turn + 3;
  if (g.hasItem('mammoth') && f.somMet && !f.somReleased && !f.somKept) {
    g.removeItem('mammoth');
    g.pushDialog({
      who: 'Легенда о Сомике',
      color: '#60a0a0',
      text: 'На мамонтовое мясо клюёт что-то огромное. Леска звенит, удочка гнётся дугой… Бени тянет, тянет — и вытаскивает Сомика!\n\nВесь мошав сбегается смотреть: такой рыбины никто не видел. Сомик лежит на песке и грустно смотрит на Бени.\n\n«Буль… Отпустишь — станешь другом реки».',
      voice: 'som_2_ru',
      foreign: { orig: 'תשחרר אותי — ותהיה חבר של הנחל.', tr: 'Тешахрер оти ве-тихье хавер шель ха-нахаль.', ru: 'Отпусти меня — и станешь другом ручья.', rtl: true },
      options: [
        { label: 'Отпустить Сомика', act: () => { f.somReleased = true; f.somSpirit = true; g.somMemory = 5; g.popup('Дух реки', 'Сомик уходит в глубину, махнув хвостом. Теперь он — дух реки и раз за забег спасёт Бени от утопления. Он оставил на песке чешуйку-ключ.', '#60a0a0', () => { g.addXp(40); if (!g.hasItem('key_som')) g.addItem('key_som'); g.achieve('som', 'Друг реки'); }); } },
        { label: 'Оставить Сомика себе', act: () => { f.somKept = true; g.somMemory = 2; g.addXp(500); const s = g.map.actors.find((a) => a.kind === 'som'); if (s) { s.dead = true; g.map.actors = g.map.actors.filter((a) => a !== s); } g.map.flags.musicOverride = 'level1_night'; g.msg('+500 опыта. Но речка стала тише и грустнее…', '#8080a0'); } },
      ],
    });
    return true;
  }
  const roll = g.rng.next();
  let what: string;
  if (roll < 0.06 && !f.romanCoin) {
    f.romanCoin = true;
    g.addItem('coin_roman');
    g.foundSecret('L1_roman', 'Монета римского императора');
    what = 'Монета! Древняя, римская — с профилем императора. Отсылка к древней истории Израиля.';
  } else if (roll < 0.14 && !g.hasItem('key_som')) {
    g.addItem('key_som');
    what = 'На крючке — ключ в форме рыбьей чешуйки!';
  } else what = g.rng.pick(['Старая кроссовка.', 'Ржавая банка из-под колы.', 'Лягушка! Она возмущённо квакает и прыгает обратно.', 'Ничего. Клевало, но сорвалось.', 'Пучок водорослей.', 'Черепашка! Бени отпускает её.']);
  g.msg('Рыбалка: ' + what, '#60c0ff');
  if (!f.somMet) g.msg('В глубине мелькает огромная усатая тень…', '#60a0a0');
  else if (!f.somReleased && !f.somKept) g.msg('Сомика на обычную приманку не поймать. Нужна особая — мамонтовое мясо от Якута.', '#60a0a0');
  return true;
}

// ───────────────────────────────────────── военная база: холм
function waitTakeoff(g: Game): boolean {
  const f = g.flags;
  g.msg('Бени садится на холме и ждёт…', '#c0a060');
  for (let i = 0; i < 15 && g.mode !== 'dead'; i++) g.endTurn();
  g.fx.push({ kind: 'jet', ttl: 40, max: 40 });
  g.fx.push({ kind: 'shake', ttl: 20, max: 20 });
  g.hooks.sfx('jet_flyby');
  f.takeoffs = (f.takeoffs ?? 0) + 1;
  if (f.takeoffs === 1) {
    g.stats.nagl += 1;
    g.achieve('pilot_dream', 'Мечта пилота');
    g.popup('Мечта пилота', 'С рёвом, от которого дрожит земля, с полосы поднимается реактивный самолёт. Бени смотрит, пока тот не превращается в точку. «Когда-нибудь…» (+1 Наглость)', '#e0e0ff');
  } else g.msg(`Самолёт взлетает! (${f.takeoffs}/3${f.takeoffs >= 3 ? ' — расскажи папе' : ''})`, '#e0e0ff');
  return true;
}

// ───────────────────────────────────────── рок-измерение
function rockChallenge(g: Game): boolean {
  const f = g.flags;
  if (f.rockDone) {
    g.msg('Толпа скандирует: «БЕ-НИ!»', '#ff60a0');
    return false;
  }
  const seq = ['E', 'G', 'A', 'B'];
  let ok = 0;
  const ask = (i: number) => {
    if (i >= seq.length) {
      f.rockDone = true;
      g.stats.rock += ok >= 4 ? 2 : 1;
      g.popup('Ритм-челлендж', ok >= 4 ? 'Идеально! «Рыжий рифф» гремит над стадионом. +2 Рок.' : `Нот угадано: ${ok}/4. Толпа всё равно в восторге. +1 Рок.`, '#ff60a0', () => g.achieve('rockstage', 'Рок-звезда'));
      return;
    }
    const opts = g.rng.shuffle(['E', 'G', 'A', 'B', 'D']).slice(0, 3);
    if (!opts.includes(seq[i])) opts[g.rng.int(0, 2)] = seq[i];
    g.pushDialog({
      who: 'Ритм-челлендж',
      color: '#ff60a0',
      text: `«Рыжий рифф» — восходящая фраза из четырёх нот. Нота ${i + 1}?`,
      options: opts.map((o) => ({ label: o, act: () => { if (o === seq[i]) ok++; ask(i + 1); } })),
    });
  };
  ask(0);
  return true;
}

// ───────────────────────────────────────── мини-босс «Двое в туалете»
function startFrench(g: Game) {
  const f = g.flags;
  const r = g.map.flags.wcRoom;
  f.frenchState = 'fight';
  f.frenchTurn = 0;
  const cx = r[0] + Math.floor(r[2] / 2), cy = r[1] + Math.floor(r[3] / 2);
  const p1 = g.freeNear(cx - 2, cy) ?? { x: cx, y: cy };
  g.spawn('french1', p1.x, p1.y);
  const p2 = g.freeNear(cx + 2, cy) ?? { x: cx, y: cy };
  g.spawn('french2', p2.x, p2.y);
  g.map.flags.musicOverride = 'boss_french';
  g.hooks.music('boss_french');
  g.hooks.voice('french_1_fr');
  g.pushDialog({
    who: 'Двое в туалете',
    color: '#4080ff',
    text: '«Allez, petit!» Два француза зажимают Бени в школьном туалете. Один держит, другой бьёт.\n\nТактика: кабинки — укрытие, двери кабинок — оружие (Пробел у кабинки), мокрый пол скользкий для всех. Если Амир или Якут — твои друзья, они ворвутся на 3-м ходу.',
    options: [{ label: '«Я сильнее вас двоих!»', act: () => g.hooks.voice('beni_4_ru') }],
  });
}

// ───────────────────────────────────────── босс «Железный Грохот»
function startBoss(g: Game) {
  const f = g.flags;
  f.bossState = { phase: 1, t: 0, lane: -1, warn: 0 };
  g.maps.boss.returnTo = { map: 'yard', x: 61, y: 21 };
  g.enterMap('boss', g.maps.boss.start.x, g.maps.boss.start.y);
  g.hooks.sfx('ghost_horn');
  g.popup('«Железный Грохот»', 'Фаза 1. Поезд-призрак мчится по путям! Смотри, какая колея загорается, — и уходи с неё. Прыгай через рельсы (J).', '#a080ff');
}

const SHADOW_NAMES = ['Тень злой собаки', 'Тень охранника', 'Тень вороны', 'Тень шакала', 'Тень француза', 'Тень ворчливого соседа'];

function bossTurn(g: Game) {
  const f = g.flags;
  const bs = f.bossState;
  if (!bs) return;
  const m = g.map;
  bs.t++;
  const lanes: number[] = m.flags.lanes;
  const strike = (period: number, dmg: number) => {
    if (bs.warn > 0) {
      bs.warn--;
      g.fx.push({ kind: 'lane', y: bs.lane, ttl: 2, max: 2, color: '#ff4040' });
      if (bs.warn === 0) {
        g.fx.push({ kind: 'train', y: bs.lane, ttl: 8, max: 8 });
        g.hooks.sfx('train_approach');
        for (const a of [...m.actors]) if (a.y === bs.lane && a.kind !== 'train_boss') g.damage(a, dmg, null, '«Железный Грохот»');
      }
    } else if (bs.t % period === 0) {
      bs.lane = g.rng.pick(lanes);
      bs.warn = 2;
      g.fx.push({ kind: 'lane', y: bs.lane, ttl: 2, max: 2, color: '#ff4040' });
      g.msg('Колея загорается — поезд идёт!', '#ff8080');
      g.hooks.sfx('ghost_horn');
    }
  };
  if (bs.phase === 1) {
    strike(4, 6);
    if (bs.t >= 18) {
      bs.phase = 2;
      for (let i = 0; i < 6; i++) {
        const s = g.freeNear(4 + i * 7, 3) ?? { x: 4 + i * 7, y: 3 };
        g.spawn('shadow', s.x, s.y, { name: SHADOW_NAMES[i] });
      }
      g.popup('Фаза 2', 'Поезд останавливается. Из вагонов выходят «тени страхов» — тёмные копии всех, кого Бени боялся этим летом.', '#a080ff');
    }
  } else if (bs.phase === 2) {
    if (!m.actors.some((a) => a.kind === 'shadow')) {
      bs.phase = 3;
      const b = g.spawn('train_boss', 22, 10);
      b.hp = b.maxHp = 60;
      // друзья приходят на помощь
      const names: string[] = [];
      for (const who of FRIENDS) {
        if (!f['friend_' + who]) continue;
        const s = g.freeNear(g.player.x, g.player.y);
        if (!s) continue;
        const a = g.spawn(who, s.x, s.y);
        a.faction = 'ally';
        a.ai = 'companion';
        a.tags.delete('npc');
        names.push(FRIEND_NAMES[who]);
      }
      g.fx.push({ kind: 'jet', ttl: 40, max: 40 });
      g.hooks.sfx('jet_flyby');
      b.stun = 2;
      g.popup('Фаза 3', `Бени берёт гитару. Каждый аккорд разбивает часть поезда — обычные удары его не берут!\n\n${names.length ? 'На помощь приходят: ' + names.join(', ') + '. Каждый друг усиливает аккорды.' : 'Друзей рядом нет… Бени придётся справляться самому.'}${f.campfire ? ' После страшилок у костра друзья совсем не боятся.' : ''}\n\nВ небе с рёвом пролетает самолёт с базы — его рёв на миг заглушает Грохот!`, '#a080ff');
    }
  } else if (bs.phase === 3) {
    strike(5, 5);
    if (bs.t % 9 === 0) {
      const s = g.freeNear(22, 10);
      if (s) g.spawn('shadow', s.x, s.y, { name: g.rng.pick(SHADOW_NAMES) });
    }
  }
}

function bossWin(g: Game) {
  const f = g.flags;
  f.bossDone = true;
  f.bossState = undefined;
  g.addItem('clock_shard', 1, true);
  g.hooks.sfx('train_break');
  g.hooks.music('victory');
  g.achieve('boss1', 'Железный Грохот побеждён');
  g.pushDialog({
    who: 'Победа',
    color: '#ffd080',
    text: 'Последний аккорд — и призрачный поезд рассыпается искрами… и превращается в обычный ночной поезд. Он уезжает, постукивая колёсами.\n\nДрузья сидят на холме и смотрят ему вслед. Закат над Маскерет-Батьей, коты, гитара.\n\n«Детство не заканчивается. Оно просто становится воспоминанием».\n\n(Найден осколок часов — один из четырёх.)',
    options: [{
      label: 'Дальше — Уровень 2: Школа',
      act: () => {
        g.album.memories += 10;
        g.album.pages.unshift({ date: new Date().toLocaleDateString('ru-RU'), level: 1, text: 'Бени победил «Железный Грохот». Детство стало воспоминанием.' });
        g.startLevel(2);
      },
    }],
  });
}

export { gsGive, flood, DIRS8 };
export type { Actor };
