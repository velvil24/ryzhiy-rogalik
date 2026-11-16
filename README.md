# Рыжий Рогалик

Браузерный roguelike про Бени — мальчика с гитарой, который прыгал выше крыш. Пять уровней — пять этапов жизни: детство в Израиле, школа, Прага, Таиланд и финал «Продолжение следует…».

## Запуск

Нужен Node.js 18+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # автотесты генерации и механик
npm run build      # сборка в dist/
npm run preview    # посмотреть сборку
```

## Публикация на Cloudflare Pages

```bash
npx wrangler login                     # один раз, вход в аккаунт Cloudflare
npm run deploy                         # = build + wrangler pages deploy dist --project-name ryzhiy-rogalik
```

Либо с токеном: `CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npm run deploy`.

## Звук (ElevenLabs)

Список всех звуков с промптами — `src/audio/manifest.json`. Файлы лежат в `assets/audio/{music,sfx,voice}/<id>.mp3`. Сгенерировать недостающие:

```bash
cp .env.example .env    # вписать ELEVENLABS_API_KEY
node scripts/generate-audio.mjs            # только отсутствующие файлы
node scripts/generate-audio.mjs --only sfx # только звуки
```

Без файлов игра работает: вместо них звучат синтезированные заглушки.

## Управление

| Клавиша | Действие |
|---------|----------|
| Стрелки / WASD / цифры | ходить (7 9 1 3 — по диагонали) |
| Shift + стрелка | повернуться без шага |
| Пробел / Enter | действие: поговорить, взять, порыбачить, отдохнуть |
| G | гитара (аккорды E, A, G, Power Chord) |
| L | присмотреться (норы, отражение в воде) |
| J | прыжок |
| T | бросить камень |
| R | прочитать вывеску |
| > | пролезть в трубу |
| I / Q / M | вещи / квесты / карта |
| Tab | режим чистого ASCII |
| O | звук вкл/выкл |

Архитектура, допущения и открытые вопросы — в [DESIGN.md](DESIGN.md).
