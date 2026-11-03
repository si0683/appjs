import { format } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { Link, Stack } from 'expo-router';
import {
  Calculator,
  Download,
  FileSpreadsheet,
  FileText,
  Upload,
  Wallet,
} from 'lucide-react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { toast } from 'sonner-native';

import { DataTable, type DataColumn } from '@/components/app/data-table';
import { DealReportView } from '@/components/app/deal-report';
import { EmptyState } from '@/components/app/empty-state';
import { Screen } from '@/components/app/screen';
import { AreaChart, BarChart, PieChart, type AreaPoint } from '@/components/charts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { TradeRow } from '@/db/schema';
import { seedDemoTrades, tradesRepo, useTrades } from '@/db/trades';
import { useTickers, WATCHLIST } from '@/features/market';
import { importTrades } from '@/features/portfolio/import';
import { portfolioStats, QUOTE } from '@/features/portfolio/stats';
import { useChartTheme } from '@/lib/chart-theme';
import { D, formatMoney, formatNumber, formatPercent, type Num } from '@/lib/decimal';
import { exportTable, type ExportColumn, type ExportFormat } from '@/lib/export';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export default function PortfolioScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const dateLocale = locale === 'ru' ? ru : enUS;
  const theme = useChartTheme();
  const trades = useTrades();
  const tickers = useTickers(WATCHLIST);
  const [scrub, setScrub] = React.useState<AreaPoint | null>(null);

  const prices = React.useMemo(
    () => Object.fromEntries((tickers.data ?? []).map((x) => [x.symbol, x.last])),
    [tickers.data]
  );
  const stats = React.useMemo(() => portfolioStats(trades.data, prices), [trades.data, prices]);
  const curve = React.useMemo(
    () => stats.curve.map((p) => ({ x: p.time, y: p.equity })),
    [stats.curve]
  );

  const money = (v: Num) => formatMoney(v, 'USD', locale).replace('$', '') + ' ' + QUOTE;
  const pct = (v: number) => formatPercent(v * 100, 2, locale);

  const headerRight = () => (
    <Link href="/calculator" asChild>
      <Button
        size="icon"
        variant="ghost"
        className="mr-2"
        accessibilityLabel={t('portfolio.calculator')}>
        <Icon as={Calculator} className="text-primary" />
      </Button>
    </Link>
  );

  if (trades.data.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerRight }} />
        <EmptyState icon={Wallet} title={t('portfolio.empty')} hint={t('portfolio.emptyHint')}>
          <Button onPress={() => void seedDemoTrades()}>
            <Text>{t('portfolio.seed')}</Text>
          </Button>
          <Button variant="outline" onPress={() => void runImport()}>
            <Icon as={Upload} />
            <Text>{t('portfolio.import')}</Text>
          </Button>
        </EmptyState>
      </>
    );
  }

  async function runImport() {
    try {
      const n = await importTrades();
      if (n !== null) toast.success(t('portfolio.imported', { count: n }));
    } catch {
      toast.error(t('portfolio.importError'));
    }
  }

  const tradeColumns: ExportColumn<TradeRow>[] = [
    { title: t('portfolio.time'), value: (r) => format(r.createdAt, 'yyyy-MM-dd HH:mm') },
    { title: t('portfolio.symbol'), value: (r) => r.symbol },
    { title: t('portfolio.side'), value: (r) => r.side },
    { title: t('market.price'), value: (r) => r.price, numeric: true },
    { title: t('portfolio.qty'), value: (r) => r.qty, numeric: true },
    { title: t('market.total'), value: (r) => D(r.price).mul(r.qty).toFixed(2), numeric: true },
    { title: 'fee', value: (r) => r.fee, numeric: true },
  ];

  const doExport = async (formatName: ExportFormat) => {
    tap();
    await exportTable({
      format: formatName,
      fileName: `trades-${format(new Date(), 'yyyy-MM-dd')}`,
      title: t('portfolio.reportTitle'),
      subtitle: `${t('portfolio.equity')}: ${money(stats.equity)} · ${t('portfolio.totalReturn')}: ${pct(stats.totalReturn)}`,
      rows: trades.data,
      columns: tradeColumns,
    });
  };

  const holdingCols: DataColumn<(typeof stats.holdings)[number]>[] = [
    {
      id: 'symbol',
      title: t('portfolio.symbol'),
      width: 96,
      value: (h) => h.symbol.replace(QUOTE, ''),
    },
    {
      id: 'qty',
      title: t('portfolio.qty'),
      width: 92,
      align: 'right',
      value: (h) => Number(h.qty),
      render: (h) => <Cell v={formatNumber(h.qty, 4, locale)} />,
    },
    {
      id: 'avg',
      title: t('portfolio.avg'),
      width: 100,
      align: 'right',
      value: (h) => Number(h.avgPrice),
      render: (h) => <Cell v={formatNumber(h.avgPrice, 2, locale)} />,
    },
    {
      id: 'value',
      title: t('portfolio.value'),
      width: 100,
      align: 'right',
      value: (h) => Number(h.value),
      render: (h) => <Cell v={formatNumber(h.value, 2, locale)} />,
    },
    {
      id: 'pnl',
      title: t('portfolio.pnl'),
      width: 100,
      align: 'right',
      value: (h) => Number(h.pnl),
      render: (h) => <Cell v={formatPercent(h.pnlPercent, 2, locale)} tone={Number(h.pnl)} />,
    },
  ];
  const tradeCols: DataColumn<TradeRow>[] = [
    {
      id: 'time',
      title: t('portfolio.time'),
      width: 104,
      value: (r) => +r.createdAt,
      render: (r) => <Cell v={format(r.createdAt, 'dd.MM HH:mm', { locale: dateLocale })} />,
    },
    {
      id: 'symbol',
      title: t('portfolio.symbol'),
      width: 76,
      value: (r) => r.symbol.replace(QUOTE, ''),
    },
    {
      id: 'side',
      title: t('portfolio.side'),
      width: 68,
      value: (r) => r.side,
      render: (r) => (
        <Cell
          v={t(r.side === 'buy' ? 'market.buy' : 'market.sell')}
          tone={r.side === 'buy' ? 1 : -1}
        />
      ),
    },
    {
      id: 'price',
      title: t('market.price'),
      width: 96,
      align: 'right',
      value: (r) => Number(r.price),
      render: (r) => <Cell v={formatNumber(r.price, 2, locale)} />,
    },
    {
      id: 'qty',
      title: t('portfolio.qty'),
      width: 84,
      align: 'right',
      value: (r) => Number(r.qty),
      render: (r) => <Cell v={formatNumber(r.qty, 4, locale)} />,
    },
  ];

  const headline = scrub
    ? { value: scrub.y, date: format(scrub.x, 'd MMM yyyy', { locale: dateLocale }) }
    : { value: Number(stats.equity), date: null };

  return (
    <Screen>
      <Stack.Screen options={{ headerRight }} />
      <View className="gap-1">
        <Text variant="muted">{headline.date ?? t('portfolio.equity')}</Text>
        <Text className="text-3xl font-bold tabular-nums">{money(headline.value)}</Text>
        <Text
          className={cn('font-medium', stats.totalReturn >= 0 ? 'text-green-600' : 'text-red-500')}>
          {pct(stats.totalReturn)}
        </Text>
      </View>

      <AreaChart
        data={curve}
        height={200}
        color={stats.totalReturn >= 0 ? theme.up : theme.down}
        formatX={(x) => format(x, 'MMM', { locale: dateLocale })}
        formatY={(y) => formatNumber(y / 1000, 1, locale) + 'k'}
        onScrub={setScrub}
      />

      <View className="flex-row flex-wrap gap-2">
        <Metric
          label={t('portfolio.realized')}
          value={money(stats.realized)}
          tone={Number(stats.realized)}
        />
        <Metric
          label={t('portfolio.unrealized')}
          value={money(stats.unrealized)}
          tone={Number(stats.unrealized)}
        />
        <Metric label={t('portfolio.cagr')} value={pct(stats.cagr)} tone={stats.cagr} />
        <Metric label={t('portfolio.drawdown')} value={pct(-stats.maxDrawdown)} tone={-1} />
        <Metric label={t('portfolio.sharpe')} value={formatNumber(stats.sharpe, 2, locale)} />
        <Metric label={t('portfolio.sortino')} value={formatNumber(stats.sortino, 2, locale)} />
        <Metric label={t('portfolio.volatility')} value={pct(stats.volatility)} />
        <Metric label={t('portfolio.winRate')} value={pct(stats.winRate)} />
        <Metric
          label={t('portfolio.profitFactor')}
          value={
            Number.isFinite(stats.profitFactor) ? formatNumber(stats.profitFactor, 2, locale) : '∞'
          }
        />
      </View>

      <Section title={t('report.title')}>
        <DealReportView report={stats.report} />
      </Section>

      <Section title={t('portfolio.monthly')}>
        <BarChart
          data={stats.monthly.slice(-8).map((m) => ({
            label: format(new Date(m.month + '-01'), 'LLL', { locale: dateLocale }),
            value: m.value * 100,
          }))}
          formatY={(y) => `${formatNumber(y, 0, locale)}%`}
        />
      </Section>

      <Section title={t('portfolio.allocation')}>
        <View className="flex-row items-center gap-4">
          <PieChart data={stats.allocation} size={150} />
          <View className="flex-1 gap-2">
            {stats.allocation.map((a, i) => (
              <View key={a.label} className="flex-row items-center gap-2">
                <View
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: theme.series[i % theme.series.length] }}
                />
                <Text className="flex-1 text-sm">{a.label}</Text>
                <Text className="text-sm tabular-nums">{formatNumber(a.value, 0, locale)}</Text>
              </View>
            ))}
          </View>
        </View>
      </Section>

      <Section title={t('portfolio.holdings')}>
        <DataTable
          data={stats.holdings}
          columns={holdingCols}
          initialSort={{ id: 'value', desc: true }}
        />
      </Section>

      <Section
        title={t('portfolio.trades')}
        right={
          <View className="flex-row gap-1">
            <Button size="sm" variant="ghost" onPress={() => void runImport()}>
              <Icon as={Upload} className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Icon as={Download} className="size-4" />
                  <Text>{t('portfolio.export')}</Text>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onPress={() => void doExport('xlsx')}>
                  <Icon as={FileSpreadsheet} className="size-4" />
                  <Text>Excel (.xlsx)</Text>
                </DropdownMenuItem>
                <DropdownMenuItem onPress={() => void doExport('csv')}>
                  <Icon as={FileText} className="size-4" />
                  <Text>CSV</Text>
                </DropdownMenuItem>
                <DropdownMenuItem onPress={() => void doExport('pdf')}>
                  <Icon as={FileText} className="size-4" />
                  <Text>PDF</Text>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </View>
        }>
        <DataTable
          data={trades.data.slice(0, 50)}
          columns={tradeCols}
          initialSort={{ id: 'time', desc: true }}
        />
      </Section>

      <Button variant="ghost" onPress={() => void tradesRepo.clear()}>
        <Text className="text-destructive">{t('portfolio.clear')}</Text>
      </Button>
    </Screen>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex-row items-center justify-between px-4">
        <CardTitle>{title}</CardTitle>
        {right}
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: number }) {
  return (
    <View className="min-w-[47%] flex-1 gap-0.5 rounded-xl border border-border bg-card p-3">
      <Text variant="muted" className="text-xs">
        {label}
      </Text>
      <Text
        className={cn(
          'font-semibold tabular-nums',
          tone !== undefined && tone > 0 && 'text-green-600',
          tone !== undefined && tone < 0 && 'text-red-500'
        )}>
        {value}
      </Text>
    </View>
  );
}

function Cell({ v, tone }: { v: string; tone?: number }) {
  return (
    <Text
      numberOfLines={1}
      className={cn(
        'text-sm tabular-nums',
        tone !== undefined && (tone >= 0 ? 'text-green-600' : 'text-red-500')
      )}>
      {v}
    </Text>
  );
}
