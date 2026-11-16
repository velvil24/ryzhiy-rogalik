// Генерация звука через ElevenLabs по src/audio/manifest.json.
// Ключ берётся из переменной окружения ELEVENLABS_API_KEY или из файла .env (в git не попадает).
// Использование: node scripts/generate-audio.mjs [--only music|sfx|voice] [--force]
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const env = fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '';
const KEY = process.env.ELEVENLABS_API_KEY || (env.match(/ELEVENLABS_API_KEY=(.+)/) || [])[1]?.trim();
if (!KEY) {
  console.error('Нет ключа: задайте ELEVENLABS_API_KEY в .env');
  process.exit(1);
}
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const force = args.includes('--force');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/audio/manifest.json'), 'utf8'));
const API = 'https://api.elevenlabs.io/v1';
const voiceCache = path.join(root, 'scripts/.voices.json');
const voices = fs.existsSync(voiceCache) ? JSON.parse(fs.readFileSync(voiceCache, 'utf8')) : {};

async function post(url, body) {
  const r = await fetch(API + url, { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r;
}

async function voiceFor(item) {
  if (voices[item.voice]) return voices[item.voice];
  // Voice Design: превью голоса по описанию, затем сохранение
  const prev = await (await post('/text-to-voice/create-previews', { voice_description: item.voice_prompt, text: 'Привет! Это тестовая фраза для создания голоса героя игры Рыжий Рогалик. Она достаточно длинная.' })).json();
  const gen = prev.previews[0].generated_voice_id;
  const saved = await (await post('/text-to-voice/create-voice-from-preview', { voice_name: 'Rogalik ' + item.voice, voice_description: item.voice_prompt, generated_voice_id: gen })).json();
  voices[item.voice] = saved.voice_id;
  fs.writeFileSync(voiceCache, JSON.stringify(voices, null, 1));
  return saved.voice_id;
}

for (const item of manifest.items) {
  if (only && item.type !== only) continue;
  const out = path.join(root, 'assets', item.file);
  if (!force && fs.existsSync(out)) continue;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  try {
    let r;
    if (item.type === 'sfx') r = await post('/sound-generation', { text: item.prompt, duration_seconds: item.duration_seconds ?? undefined });
    else if (item.type === 'music') r = await post('/music', { prompt: item.prompt, music_length_ms: /3 minutes/.test(item.prompt) ? 180000 : /2\.5 minutes/.test(item.prompt) ? 150000 : /1\.5 minutes/.test(item.prompt) ? 90000 : /1 minute/.test(item.prompt) ? 60000 : /40 seconds/.test(item.prompt) ? 40000 : /30 seconds/.test(item.prompt) ? 30000 : /3 seconds/.test(item.prompt) ? 3000 : 120000 });
    else r = await post(`/text-to-speech/${await voiceFor(item)}`, { text: item.text, model_id: 'eleven_multilingual_v2' });
    fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
    console.log('✓', item.id);
  } catch (e) {
    console.error('✗', item.id, e.message);
  }
}
