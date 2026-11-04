// Работа с переводами, без зависимостей.
//   npm run i18n -- check             ключи языков совпадают, все t('…') из кода есть в ru.json,
//                                     текст в разметке без перевода — предупреждение
//   npm run i18n -- export [file]     все языки в CSV (по умолчанию i18n.csv) — для переводчиков и Google Sheets
//   npm run i18n -- import <file>     CSV обратно в src/i18n/locales/*.json
//   npm run i18n -- add <lang>        новый язык: src/i18n/locales/<lang>.json + locales/<lang>.json
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/i18n/locales';
const BASE = 'ru';
const [cmd = 'check', arg] = process.argv.slice(2);

const load = (lang) => JSON.parse(readFileSync(join(DIR, `${lang}.json`), 'utf8'));
const save = (lang, data) =>
  writeFileSync(join(DIR, `${lang}.json`), JSON.stringify(data, null, 2) + '\n');
const langs = () =>
  readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .sort((a, b) => (a === BASE ? -1 : b === BASE ? 1 : a.localeCompare(b)));

function flatten(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    if (v && typeof v === 'object') Object.assign(acc, flatten(v, `${prefix}${k}.`));
    else acc[`${prefix}${k}`] = String(v);
    return acc;
  }, {});
}
function setPath(obj, path, value) {
  const parts = path.split('.');
  let o = obj;
  for (const p of parts.slice(0, -1)) o = o[p] ??= {};
  o[parts.at(-1)] = value;
}
const plural = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '');

function files(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(tsx?|jsx?)$/.test(f) && !p.includes('__tests__')) out.push(p);
  }
  return out;
}

// CSV (RFC 4180): запятые, кавычки, переводы строк внутри значений
const csvCell = (s) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') row.push(cell), (cell = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell), rows.push(row), (row = []), (cell = '');
    } else cell += c;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  return rows.filter((r) => r.some((x) => x !== ''));
}

if (cmd === 'check') {
  let problems = 0;
  const base = flatten(load(BASE));
  const baseKeys = new Set(Object.keys(base).map(plural));
  for (const lang of langs().filter((l) => l !== BASE)) {
    const keys = new Set(Object.keys(flatten(load(lang))).map(plural));
    const missing = [...baseKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !baseKeys.has(k));
    if (missing.length) problems++, console.log(`✖ ${lang}: нет ключей: ${missing.join(', ')}`);
    if (extra.length) console.log(`! ${lang}: лишние ключи: ${extra.join(', ')}`);
  }
  const used = new Map();
  const hardcoded = [];
  for (const file of files('src')) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\bt\(\s*['"]([\w.]+)['"]/g)) used.set(m[1], file);
    if (file.includes(`${join('src', 'components', 'ui')}`)) continue;
    text.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      if (/>[^<>{}]*[А-Яа-яЁё][^<>{}]*</.test(line)) hardcoded.push(`${file}:${i + 1}`);
    });
  }
  for (const [key, file] of used) {
    if (!baseKeys.has(plural(key)) && !baseKeys.has(key))
      problems++, console.log(`✖ ${file}: ключа «${key}» нет в ${BASE}.json`);
  }
  for (const h of hardcoded) console.log(`! текст без перевода: ${h}`);
  console.log(
    problems
      ? `\n${problems} проблем(ы) с переводами`
      : `✔ Языки: ${langs().join(', ')} — ключи совпадают, все t('…') найдены`
  );
  process.exit(problems ? 1 : 0);
}

if (cmd === 'export') {
  const file = arg ?? 'i18n.csv';
  const all = langs();
  const flat = Object.fromEntries(all.map((l) => [l, flatten(load(l))]));
  const keys = [...new Set(all.flatMap((l) => Object.keys(flat[l])))];
  const lines = [['key', ...all], ...keys.map((k) => [k, ...all.map((l) => flat[l][k] ?? '')])];
  writeFileSync(file, '\uFEFF' + lines.map((r) => r.map(csvCell).join(',')).join('\n') + '\n');
  console.log(`✔ ${keys.length} строк, языки ${all.join(', ')} → ${file}`);
}

if (cmd === 'import') {
  if (!arg || !existsSync(arg)) throw new Error('Укажите CSV: npm run i18n -- import i18n.csv');
  const [head, ...rows] = parseCsv(readFileSync(arg, 'utf8').replace(/^\uFEFF/, ''));
  const columns = head.slice(1);
  for (const [col, lang] of columns.entries()) {
    const data = {};
    for (const r of rows) if (r[col + 1] !== undefined && r[col + 1] !== '') setPath(data, r[0], r[col + 1]);
    save(lang, data);
  }
  console.log(`✔ ${rows.length} строк → ${columns.map((l) => `${DIR}/${l}.json`).join(', ')}`);
}

if (cmd === 'add') {
  if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(arg ?? '')) throw new Error('Код языка: npm run i18n -- add de');
  if (existsSync(join(DIR, `${arg}.json`))) throw new Error(`${arg}.json уже есть`);
  // Основа — английский (если есть): переводчику проще, чем с русского
  save(arg, load(existsSync(join(DIR, 'en.json')) ? 'en' : BASE));
  const app = JSON.parse(readFileSync('app.json', 'utf8'));
  const name = app.expo.name;
  writeFileSync(
    `locales/${arg}.json`,
    JSON.stringify({ ios: { CFBundleDisplayName: name }, android: { app_name: name } }, null, 2) + '\n'
  );
  app.expo.locales = { ...app.expo.locales, [arg]: `./locales/${arg}.json` };
  for (const p of app.expo.plugins) {
    if (Array.isArray(p) && p[0] === 'expo-localization') {
      for (const os of ['ios', 'android']) {
        const list = (p[1].supportedLocales ??= {})[os] ?? [];
        if (!list.includes(arg)) p[1].supportedLocales[os] = [...list, arg];
      }
    }
  }
  writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
  console.log(`✔ ${DIR}/${arg}.json (копия английского — переведите), locales/${arg}.json, app.json
Дальше: добавьте язык в LANGUAGES и LOADERS в src/i18n/index.ts (dir: 'rtl' для арабского, иврита, фарси).`);
}
