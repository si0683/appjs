import { Stack, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { CandleChart } from '@/components/charts';
import { DemoBanner } from '@/components/market/demo-banner';
import { OrderBook } from '@/components/market/order-book';
import { OrderForm } from '@/components/market/order-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTrades } from '@/db/trades';
import {
  symbolInfo,
  type Timeframe,
  useCandles,
  useOrderBook,
  useTickers,
} from '@/features/market';
import { splitSymbol } from '@/features/market/binance';
import { type IndicatorId, overlays } from '@/features/market/indicators';
import { portfolioStats } from '@/features/portfolio/stats';
import { useChartTheme } from '@/lib/chart-theme';
import { D, formatCompact, formatNumber, formatPercent, priceDigits } from '@/lib/decimal';
import { cn } from '@/lib/utils';

const TIMEFRAMES: Timeframe[] = ['1m', '15m', '1h', '4h', '1d'];
const INDICATORS: { id: IndicatorId; title: string }[] = [
  { id: 'ema20', title: 'EMA 20' },
  { id: 'ema50', title: 'EMA 50' },
  { id: 'bb', title: 'Bollinger' },
];

// Экран инструмента, как в приложениях бирж: цена, свечной график TradingView
// с индикаторами, стакан и форма сделки.
export default function SymbolScreen() {
  const { t, i18n } = useTranslation();
  const { symbol = 'BTCUSDT' } = useLocalSearchParams<{ symbol: string }>();
  const { base, quote } = splitSymbol(symbol);
  const theme = useChartTheme();
  const [tf, setTf] = React.useState<Timeframe>('1h');
  const [ind, setInd] = React.useState<IndicatorId[]>(['ema20', 'ema50']);
  const [tab, setTab] = React.useState('trade');
  const [picked, setPicked] = React.useState<string>();

  const symbols = React.useMemo(() => [symbol], [symbol]);
  const ticker = useTickers(symbols).data?.[0];
  const candles = useCandles(symbol, tf);
  const book = useOrderBook(symbol);
  const info = symbolInfo(symbol);
  const trades = useTrades();

  const lines = React.useMemo(
    () => overlays(candles.data ?? [], ind, theme.series),
    [candles.data, ind, theme.series]
  );
  const balances = React.useMemo(() => {
    const s = portfolioStats(trades.data, {});
    return { quote: s.cash, base: s.holdings.find((h) => h.symbol === symbol)?.qty ?? '0' };
  }, [trades.data, symbol]);

  const last = candles.live?.close?.toString() ?? ticker?.last ?? '0';
  const digits = priceDigits(last);
  const up = D(ticker?.changePercent ?? 0).gte(0);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: `${base}/${quote}` }} />
      <DemoBanner />
      <ScrollView contentContainerClassName="pb-10" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-end justify-between px-4 pt-3">
          <View>
            <Text
              className={cn(
                'text-3xl font-bold tabular-nums',
                up ? 'text-green-600' : 'text-red-500'
              )}>
              {formatNumber(last, digits, i18n.language)}
            </Text>
            <Text className={cn('text-sm font-medium', up ? 'text-green-600' : 'text-red-500')}>
              {ticker ? formatPercent(ticker.changePercent, 2, i18n.language) : ' '}
            </Text>
          </View>
          {ticker ? (
            <View className="items-end gap-0.5">
              <Stat
                label={t('market.high')}
                value={formatNumber(ticker.high, digits, i18n.language)}
              />
              <Stat
                label={t('market.low')}
                value={formatNumber(ticker.low, digits, i18n.language)}
              />
              <Stat
                label={t('market.volume')}
                value={formatCompact(ticker.volumeQuote, i18n.language)}
              />
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center justify-between px-2 pt-3">
          <ToggleGroup
            type="single"
            size="sm"
            value={tf}
            onValueChange={(v) => v && setTf(v as Timeframe)}>
            {TIMEFRAMES.map((x) => (
              <ToggleGroupItem key={x} value={x} aria-label={x} className="px-2">
                <Text className="text-xs">{x}</Text>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </View>
        <View className="flex-row flex-wrap gap-1 px-2 pb-2">
          <ToggleGroup
            type="multiple"
            size="sm"
            value={ind}
            onValueChange={(v) => setInd(v as IndicatorId[])}>
            {INDICATORS.map((x) => (
              <ToggleGroupItem key={x.id} value={x.id} aria-label={x.title} className="px-2">
                <Text className="text-xs">{x.title}</Text>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </View>

        {candles.data ? (
          <CandleChart
            candles={candles.data}
            live={candles.live}
            overlays={lines}
            theme={theme}
            digits={digits}
            height={340}
            dom={{ style: { height: 340 }, scrollEnabled: false }}
          />
        ) : (
          <Skeleton className="mx-4 h-[340px]" />
        )}

        <Tabs value={tab} onValueChange={setTab} className="px-4 pt-4">
          <TabsList className="w-full">
            <TabsTrigger value="trade" className="flex-1">
              <Text>{t('market.trade')}</Text>
            </TabsTrigger>
            <TabsTrigger value="book" className="flex-1">
              <Text>{t('market.book')}</Text>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="trade" className="pt-3">
            <OrderForm
              symbol={symbol}
              base={base}
              quote={quote}
              lastPrice={D(last).toFixed(digits)}
              info={info}
              pickedPrice={picked}
              availableQuote={balances.quote}
              availableBase={balances.base}
            />
          </TabsContent>
          <TabsContent value="book" className="pt-3">
            <OrderBook
              book={book.data}
              tickSize={info.tickSize}
              onPick={(p) => {
                setPicked(p);
                setTab('trade');
              }}
            />
          </TabsContent>
        </Tabs>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Text variant="muted" className="text-xs">
      {label} <Text className="text-xs font-medium tabular-nums">{value}</Text>
    </Text>
  );
}
