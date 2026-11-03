import DecimalJs from 'decimal.js';

// Деньги, цены и объёмы считаем ТОЛЬКО через Decimal: в обычных числах JS
// 0.1 + 0.2 = 0.30000000000000004, на бирже такая ошибка — реальные деньги.
// Храним и передаём как строки ('64250.10'), считаем через D(...).
DecimalJs.set({ precision: 40, rounding: DecimalJs.ROUND_HALF_UP });

export { DecimalJs as Decimal };
export type Num = DecimalJs.Value;

export const D = (value: Num) => new DecimalJs(value || 0);

/** Округление вниз до шага (лот, шаг цены): roundToStep('0.123456', '0.001') → '0.123'. */
export function roundToStep(value: Num, step: Num, mode: 'down' | 'up' | 'nearest' = 'down') {
  const s = D(step);
  if (s.isZero()) return D(value);
  const ratio = D(value).div(s);
  const n =
    mode === 'down' ? ratio.floor() : mode === 'up' ? ratio.ceil() : ratio.toDecimalPlaces(0);
  return n.mul(s);
}

/** Сколько знаков после запятой у шага: '0.01' → 2. */
export const decimalsOf = (step: Num) => Math.max(0, D(step).decimalPlaces());

/** Изменение в процентах: (to - from) / from * 100. */
export function percentChange(from: Num, to: Num) {
  const f = D(from);
  return f.isZero() ? D(0) : D(to).minus(f).div(f).mul(100);
}

const groupCache = new Map<string, Intl.NumberFormat>();
function nf(locale: string, min: number, max: number) {
  const key = `${locale}|${min}|${max}`;
  let f = groupCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { minimumFractionDigits: min, maximumFractionDigits: max });
    groupCache.set(key, f);
  }
  return f;
}

/** Цена с фиксированным числом знаков и разделителями: 64 250,10. */
export function formatNumber(value: Num, digits = 2, locale = 'ru-RU') {
  const d = D(value).toDecimalPlaces(digits);
  return nf(locale, digits, digits).format(d.toNumber());
}

/** Компактно: 1,2 млн / 1.2M. */
export function formatCompact(value: Num, locale = 'ru-RU') {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 }).format(
    D(value).toNumber()
  );
}

/** Проценты со знаком: +2,35 %. */
export function formatPercent(value: Num, digits = 2, locale = 'ru-RU') {
  const d = D(value);
  const sign = d.gt(0) ? '+' : '';
  return `${sign}${nf(locale, digits, digits).format(d.toDecimalPlaces(digits).toNumber())} %`;
}

/** Деньги в валюте: 1 234,50 $. Для крипто-«валют» (USDT) — число + код. */
export function formatMoney(value: Num, currency = 'USD', locale = 'ru-RU', digits = 2) {
  const n = D(value).toDecimalPlaces(digits).toNumber();
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(n);
  } catch {
    return `${nf(locale, digits, digits).format(n)} ${currency}`;
  }
}

/** Знаков после запятой для цены: крупные цены — 2, мелкие монеты — больше. */
export function priceDigits(price: Num) {
  const p = D(price).abs();
  if (p.gte(1000)) return 2;
  if (p.gte(1)) return 4;
  if (p.gte(0.01)) return 5;
  return 8;
}
