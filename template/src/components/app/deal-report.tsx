import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import type { DealReport } from '@/lib/deal-stats';
import { formatNumber, type Num } from '@/lib/decimal';
import { cn } from '@/lib/utils';

// Отчёт по сделкам в порядке журнала OsEngine: общие показатели,
// прибыльные, убыточные, просадка и комиссия.
export function DealReportView({ report }: { report: DealReport }) {
  const { t, i18n } = useTranslation();
  const n = (v: Num, d = 2) => formatNumber(v, d, i18n.language);
  const h = Math.floor(report.averageHoldMs / 3_600_000);
  const m = Math.round((report.averageHoldMs % 3_600_000) / 60_000);

  return (
    <View className="gap-1">
      <Row
        label={t('report.netProfit')}
        value={n(report.netProfit)}
        tone={report.netProfit.toNumber()}
      />
      <Row
        label={t('report.netProfitPercent')}
        value={n(report.netProfitPercent)}
        tone={report.netProfitPercent.toNumber()}
      />
      <Row label={t('report.deals')} value={String(report.deals)} />
      <Row label={t('report.hold')} value={t('report.hours', { h, m })} />
      <Row label={t('report.sharpe')} value={n(report.sharpe, 4)} />
      <Row label={t('report.profitFactor')} value={n(report.profitFactor)} />
      <Row label={t('report.recovery')} value={n(report.recovery)} />
      <Row label={t('report.payoff')} value={n(report.payoff)} />
      <Row label={t('report.avgProfit')} value={n(report.avgProfit)} />
      <Row label={t('report.avgProfitPercent')} value={n(report.avgProfitPercent, 4)} />
      <Row label={t('report.avgPortfolioPercent')} value={n(report.avgPortfolioPercent, 4)} />

      {(['wins', 'losses'] as const).map((k) => (
        <View key={k} className="gap-1">
          <Separator className="my-2" />
          <Text className="text-sm font-semibold">{t(`report.${k}`)}</Text>
          <Row label={t('report.count')} value={String(report[k].count)} />
          <Row label={t('report.share')} value={`${n(report[k].percent)} %`} />
          <Row
            label={t('report.avgProfit')}
            value={n(report[k].avgProfit)}
            tone={report[k].avgProfit.toNumber()}
          />
          <Row label={t('report.avgProfitPercent')} value={n(report[k].avgProfitPercent, 4)} />
          <Row
            label={t('report.avgPortfolioPercent')}
            value={n(report[k].avgPortfolioPercent, 4)}
          />
          <Row label={t('report.maxSeries')} value={String(report[k].maxSeries)} />
        </View>
      ))}

      <Separator className="my-2" />
      <Row label={t('report.drawdown')} value={n(report.maxDrawdownPercent)} tone={-1} />
      <Row label={t('report.commission')} value={n(report.commission)} />
    </View>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: number }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-0.5">
      <Text variant="muted" className="flex-1 text-sm">
        {label}
      </Text>
      <Text
        className={cn(
          'text-sm font-medium tabular-nums',
          tone !== undefined && tone > 0 && 'text-green-600',
          tone !== undefined && tone < 0 && 'text-red-500'
        )}>
        {value}
      </Text>
    </View>
  );
}
