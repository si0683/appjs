import { expect, it } from '@jest/globals';
import en from '@/i18n/en';
import ru from '@/i18n/ru';

// Все ключи русского словаря должны быть и в английском (и наоборот).
function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

it('словари языков совпадают по ключам', () => {
  expect(keys(en).sort()).toEqual(keys(ru).sort());
});
