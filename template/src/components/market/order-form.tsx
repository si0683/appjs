import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { toast } from 'sonner-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { tradesRepo } from '@/db/trades';
import type { SymbolInfo } from '@/features/market';
import { D, decimalsOf, formatNumber, roundToStep } from '@/lib/decimal';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const FEE_RATE = '0.001'; // 0,1 % — как у большинства спотовых бирж

/** Ввод чисел: запятая → точка, только цифры и одна точка. */
const cleanNumber = (s: string) =>
  s
    .replace(',', '.')
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1');

// Форма сделки (бумажная торговля): цена, количество, доля доступного,
// итог и комиссия считаются точно через Decimal; лот округляется вниз.
export function OrderForm({
  symbol,
  base,
  quote,
  lastPrice,
  info,
  pickedPrice,
  availableQuote,
  availableBase,
}: {
  symbol: string;
  base: string;
  quote: string;
  lastPrice: string;
  info: SymbolInfo;
  pickedPrice?: string;
  availableQuote: string;
  availableBase: string;
}) {
  const { t, i18n } = useTranslation();
  const [side, setSide] = React.useState<'buy' | 'sell'>('buy');
  // Пустое поле цены = текущая цена рынка (видна подсказкой)
  const [price, setPrice] = React.useState('');
  const [qty, setQty] = React.useState('');
  const priceDigits = decimalsOf(info.tickSize);
  const qtyDigits = decimalsOf(info.lotStep);

  // Нажали уровень в стакане — подставляем его цену (без эффекта: правка во время рендера)
  const [prevPicked, setPrevPicked] = React.useState(pickedPrice);
  if (pickedPrice !== prevPicked) {
    setPrevPicked(pickedPrice);
    if (pickedPrice) setPrice(pickedPrice);
  }
  const effPrice = price || lastPrice;

  const total = D(effPrice || 0).mul(qty || 0);
  const fee = total.mul(FEE_RATE);
  const tooSmall = qty !== '' && D(qty).lt(info.minQty);

  const setPercent = (pct: number) => {
    const p = D(effPrice);
    if (p.isZero()) return;
    const max =
      side === 'buy' ? D(availableQuote).div(p.mul(D(1).plus(FEE_RATE))) : D(availableBase);
    setQty(roundToStep(max.mul(pct).div(100), info.lotStep).toFixed(qtyDigits));
  };

  const submit = async () => {
    const q = roundToStep(qty, info.lotStep);
    if (q.lt(info.minQty) || D(effPrice).lte(0)) return;
    await tradesRepo.add({
      symbol,
      side,
      price: roundToStep(effPrice, info.tickSize, 'nearest').toFixed(priceDigits),
      qty: q.toFixed(qtyDigits),
      fee: fee.toDecimalPlaces(8).toString(),
      createdAt: new Date(),
    });
    tap('success');
    toast.success(t('market.done'));
    setQty('');
  };

  return (
    <View className="gap-3">
      <ToggleGroup
        type="single"
        value={side}
        onValueChange={(v) => v && setSide(v as 'buy' | 'sell')}
        className="w-full">
        <ToggleGroupItem
          value="buy"
          aria-label={t('market.buy')}
          className={cn('flex-1', side === 'buy' && 'bg-green-600')}>
          <Text className={cn(side === 'buy' && 'text-white')}>{t('market.buy')}</Text>
        </ToggleGroupItem>
        <ToggleGroupItem
          value="sell"
          aria-label={t('market.sell')}
          className={cn('flex-1', side === 'sell' && 'bg-red-600')}>
          <Text className={cn(side === 'sell' && 'text-white')}>{t('market.sell')}</Text>
        </ToggleGroupItem>
      </ToggleGroup>

      <View className="gap-1.5">
        <Label>{`${t('market.price')}, ${quote}`}</Label>
        <Input
          value={price}
          onChangeText={(s) => setPrice(cleanNumber(s))}
          keyboardType="decimal-pad"
          placeholder={lastPrice}
        />
      </View>
      <View className="gap-1.5">
        <Label>{`${t('market.amount')}, ${base}`}</Label>
        <Input
          value={qty}
          onChangeText={(s) => setQty(cleanNumber(s))}
          keyboardType="decimal-pad"
          placeholder={info.minQty}
        />
        {tooSmall ? (
          <Text className="text-xs text-destructive">
            {t('market.tooSmall')}: {info.minQty}
          </Text>
        ) : null}
      </View>

      <View className="flex-row gap-2">
        {[25, 50, 75, 100].map((p) => (
          <Button
            key={p}
            size="sm"
            variant="outline"
            className="flex-1"
            onPress={() => setPercent(p)}>
            <Text className="text-xs">{p}%</Text>
          </Button>
        ))}
      </View>

      <View className="gap-1 rounded-lg bg-muted p-3">
        <Row
          label={t('market.total')}
          value={`${formatNumber(total, 2, i18n.language)} ${quote}`}
        />
        <Row label={t('market.fee')} value={`${formatNumber(fee, 4, i18n.language)} ${quote}`} />
      </View>

      <Button
        onPress={() => void submit()}
        disabled={!qty || tooSmall}
        className={
          side === 'buy' ? 'bg-green-600 active:bg-green-700' : 'bg-red-600 active:bg-red-700'
        }>
        <Text className="text-white">{`${t(side === 'buy' ? 'market.buy' : 'market.sell')} ${base}`}</Text>
      </Button>
      <Text variant="muted" className="text-center text-xs">
        {t('market.paper')}
      </Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text variant="muted" className="text-xs">
        {label}
      </Text>
      <Text className="text-xs font-medium tabular-nums">{value}</Text>
    </View>
  );
}
