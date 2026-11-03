import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { BookLevel, OrderBook as Book } from '@/features/market';
import { D, decimalsOf, formatNumber } from '@/lib/decimal';

// Стакан: продажи сверху (красные), покупки снизу (зелёные), полоса — накопленный объём.
// Нажатие на уровень подставляет цену в форму сделки.
export function OrderBook({
  book,
  rows = 10,
  tickSize,
  onPick,
}: {
  book?: Book;
  rows?: number;
  tickSize: string;
  onPick?: (price: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const digits = decimalsOf(tickSize);
  const { asks, bids, max, spread } = React.useMemo(() => {
    const a = (book?.asks ?? []).slice(0, rows);
    const b = (book?.bids ?? []).slice(0, rows);
    const cum = (list: BookLevel[]) => {
      let sum = D(0);
      return list.map((l) => ({ ...l, cum: (sum = sum.plus(l.qty)).toNumber() }));
    };
    const ca = cum(a);
    const cb = cum(b);
    const m = Math.max(ca.at(-1)?.cum ?? 0, cb.at(-1)?.cum ?? 0) || 1;
    const sp = a[0] && b[0] ? D(a[0].price).minus(b[0].price) : null;
    return { asks: ca.reverse(), bids: cb, max: m, spread: sp };
  }, [book, rows]);

  const line = (l: BookLevel & { cum: number }, side: 'ask' | 'bid') => (
    <Pressable
      key={side + l.price}
      onPress={() => onPick?.(l.price)}
      className="h-6 flex-row items-center">
      <View
        className={side === 'ask' ? 'bg-red-500/15' : 'bg-green-500/15'}
        style={{
          position: 'absolute',
          right: 0,
          top: 1,
          bottom: 1,
          width: `${(l.cum / max) * 100}%`,
        }}
      />
      <Text
        className={`flex-1 text-xs tabular-nums ${side === 'ask' ? 'text-red-500' : 'text-green-600'}`}>
        {formatNumber(l.price, digits, i18n.language)}
      </Text>
      <Text className="text-xs tabular-nums">{formatNumber(l.qty, 4, i18n.language)}</Text>
    </Pressable>
  );

  return (
    <View className="gap-0.5">
      <View className="flex-row pb-1">
        <Text variant="muted" className="flex-1 text-xs">
          {t('market.price')}
        </Text>
        <Text variant="muted" className="text-xs">
          {t('market.amount')}
        </Text>
      </View>
      {asks.map((l) => line(l, 'ask'))}
      <View className="items-center py-1">
        <Text variant="muted" className="text-xs">
          {t('market.spread')}: {spread ? formatNumber(spread, digits, i18n.language) : '—'}
        </Text>
      </View>
      {bids.map((l) => line(l, 'bid'))}
    </View>
  );
}
