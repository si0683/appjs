import { FlashList } from '@shopify/flash-list';
import { Link } from 'expo-router';
import { Search, WifiOff } from 'lucide-react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, View } from 'react-native';

import { EmptyState } from '@/components/app/empty-state';
import { Sparkline } from '@/components/charts';
import { DemoBanner } from '@/components/market/demo-banner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { type Ticker, useSparkline, useTickers } from '@/features/market';
import { useChartTheme } from '@/lib/chart-theme';
import { D, formatCompact, formatNumber, formatPercent, priceDigits } from '@/lib/decimal';
import { cn } from '@/lib/utils';

// Список инструментов как в приложениях бирж: цена, изменение за сутки,
// оборот и мини-график. Цены обновляются по WebSocket.
export default function MarketScreen() {
  const { t, i18n } = useTranslation();
  const query = useTickers();
  const [q, setQ] = React.useState('');
  const list = React.useMemo(
    () => (query.data ?? []).filter((x) => x.symbol.includes(q.trim().toUpperCase())),
    [query.data, q]
  );

  if (query.isError) {
    return (
      <EmptyState icon={WifiOff} title={t('market.error')} hint={query.error.message}>
        <Button onPress={() => void query.refetch()}>
          <Text>{t('market.retry')}</Text>
        </Button>
      </EmptyState>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <DemoBanner />
      <View className="px-4 pt-3 pb-2">
        <View className="justify-center">
          <Input
            value={q}
            onChangeText={setQ}
            placeholder={t('market.search')}
            className="pl-9"
            autoCapitalize="characters"
          />
          <View pointerEvents="none" className="absolute top-0 bottom-0 left-3 justify-center">
            <Icon as={Search} className="size-4 text-muted-foreground" />
          </View>
        </View>
      </View>
      {query.isPending ? (
        <View className="gap-3 p-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </View>
      ) : (
        <FlashList
          data={list}
          keyExtractor={(x) => x.symbol}
          renderItem={({ item }) => <Row ticker={item} locale={i18n.language} />}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
            />
          }
        />
      )}
    </View>
  );
}

function Row({ ticker, locale }: { ticker: Ticker; locale: string }) {
  const theme = useChartTheme();
  const spark = useSparkline(ticker.symbol);
  const up = D(ticker.changePercent).gte(0);
  return (
    <Link href={{ pathname: '/market/[symbol]', params: { symbol: ticker.symbol } }} asChild>
      <Pressable className="flex-row items-center gap-3 px-4 py-3 active:bg-muted">
        <View className="flex-1">
          <Text className="font-semibold">
            {ticker.base}
            <Text variant="muted"> / {ticker.quote}</Text>
          </Text>
          <Text variant="muted" className="text-xs">
            {formatCompact(ticker.volumeQuote, locale)}
          </Text>
        </View>
        {spark.data ? (
          <Sparkline values={spark.data} color={up ? theme.up : theme.down} />
        ) : (
          <View style={{ width: 72 }} />
        )}
        <View className="w-28 items-end gap-1">
          <Text className="font-medium tabular-nums">
            {formatNumber(ticker.last, priceDigits(ticker.last), locale)}
          </Text>
          <View className={cn('rounded px-1.5 py-0.5', up ? 'bg-green-600' : 'bg-red-600')}>
            <Text className="text-xs font-semibold text-white tabular-nums">
              {formatPercent(ticker.changePercent, 2, locale)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
