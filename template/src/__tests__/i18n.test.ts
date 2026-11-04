import { expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Все языки в src/i18n/locales должны иметь те же ключи, что и базовый ru.json,
// и одинаковые переменные {{…}} в строках.
const dir = join(__dirname, '../i18n/locales');
const load = (f: string) => JSON.parse(readFileSync(join(dir, f), 'utf8'));

function flatten(obj: object, prefix = ''): Record<string, string> {
  return Object.assign(
    {},
    ...Object.entries(obj).map(([k, v]) =>
      typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : { [`${prefix}${k}`]: String(v) }
    )
  );
}
const vars = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort().join(',');
const base = flatten(load('ru.json'));
const pluralKey = (k: string) => k.replace(/_(zero|one|two|few|many|other)$/, '');

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'ru.json')) {
  it(`${file}: те же ключи и переменные, что в ru.json`, () => {
    const other = flatten(load(file));
    // Формы множественного числа у языков разные (_few есть в русском, нет в английском) —
    // сравниваем по основе ключа
    const baseKeys = [...new Set(Object.keys(base).map(pluralKey))].sort();
    const otherKeys = [...new Set(Object.keys(other).map(pluralKey))].sort();
    expect(otherKeys).toEqual(baseKeys);
    for (const [k, v] of Object.entries(other)) {
      const ref = base[k] ?? base[`${pluralKey(k)}_other`];
      if (ref !== undefined) expect([k, vars(v)]).toEqual([k, vars(ref)]);
    }
  });
}
