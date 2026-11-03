import { evaluate, format as mathFormat } from 'mathjs';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/app/screen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { D, formatNumber, type Num } from '@/lib/decimal';
import { positionSize } from '@/lib/finance';

const clean = (s: string) => s.replace(',', '.');

// Калькулятор: свободные выражения (mathjs — матрицы, единицы, статистика),
// размер позиции по риску и сложный процент (точно, через Decimal).
export default function CalculatorScreen() {
  const { t, i18n } = useTranslation();
  const n = (v: Num, d = 2) => formatNumber(v, d, i18n.language);

  const [expr, setExpr] = React.useState('(64250 - 61000) / 61000 * 100');
  const result = React.useMemo(() => {
    try {
      const v = evaluate(expr);
      return { ok: true, text: mathFormat(v, { precision: 12 }) };
    } catch {
      return { ok: false, text: t('calc.error') };
    }
  }, [expr, t]);

  const [pos, setPos] = React.useState({
    capital: '10000',
    risk: '1',
    entry: '64250',
    stop: '62800',
  });
  const size = React.useMemo(() => {
    try {
      return positionSize({
        capital: clean(pos.capital),
        riskPercent: clean(pos.risk),
        entry: clean(pos.entry),
        stop: clean(pos.stop),
        lotStep: '0.00001',
      });
    } catch {
      return null;
    }
  }, [pos]);

  const [cmp, setCmp] = React.useState({ principal: '100000', rate: '18', years: '5' });
  const compound = React.useMemo(() => {
    try {
      const total = D(clean(cmp.principal)).mul(
        D(1)
          .plus(D(clean(cmp.rate)).div(100))
          .pow(D(clean(cmp.years)))
      );
      return { total, profit: total.minus(clean(cmp.principal)) };
    } catch {
      return null;
    }
  }, [cmp]);

  return (
    <Screen>
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle>{t('calc.expression')}</CardTitle>
        </CardHeader>
        <CardContent className="gap-2 px-4">
          <Input value={expr} onChangeText={setExpr} autoCapitalize="none" autoCorrect={false} />
          <Text variant="muted" className="text-xs">
            {t('calc.hint')}
          </Text>
          <Text className={result.ok ? 'text-2xl font-bold tabular-nums' : 'text-destructive'}>
            {result.text}
          </Text>
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle>{t('calc.position')}</CardTitle>
        </CardHeader>
        <CardContent className="gap-3 px-4">
          <View className="flex-row gap-2">
            <Field
              label={t('calc.capital')}
              value={pos.capital}
              onChange={(v) => setPos({ ...pos, capital: v })}
            />
            <Field
              label={t('calc.risk')}
              value={pos.risk}
              onChange={(v) => setPos({ ...pos, risk: v })}
            />
          </View>
          <View className="flex-row gap-2">
            <Field
              label={t('calc.entry')}
              value={pos.entry}
              onChange={(v) => setPos({ ...pos, entry: v })}
            />
            <Field
              label={t('calc.stop')}
              value={pos.stop}
              onChange={(v) => setPos({ ...pos, stop: v })}
            />
          </View>
          {size ? (
            <View className="gap-1 rounded-lg bg-muted p-3">
              <Out label={t('calc.qty')} value={n(size.qty, 5)} />
              <Out label={t('calc.riskMoney')} value={n(size.riskMoney)} />
              <Out label={t('calc.notional')} value={n(size.notional)} />
            </View>
          ) : null}
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle>{t('calc.compound')}</CardTitle>
        </CardHeader>
        <CardContent className="gap-3 px-4">
          <View className="flex-row gap-2">
            <Field
              label={t('calc.principal')}
              value={cmp.principal}
              onChange={(v) => setCmp({ ...cmp, principal: v })}
            />
            <Field
              label={t('calc.rate')}
              value={cmp.rate}
              onChange={(v) => setCmp({ ...cmp, rate: v })}
            />
            <Field
              label={t('calc.years')}
              value={cmp.years}
              onChange={(v) => setCmp({ ...cmp, years: v })}
            />
          </View>
          {compound ? (
            <View className="gap-1 rounded-lg bg-muted p-3">
              <Out label={t('calc.final')} value={n(compound.total)} />
              <Out label={t('calc.profit')} value={n(compound.profit)} />
            </View>
          ) : null}
        </CardContent>
      </Card>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-1 gap-1.5">
      <Label>{label}</Label>
      <Input value={value} onChangeText={onChange} keyboardType="decimal-pad" />
    </View>
  );
}

function Out({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text variant="muted" className="text-sm">
        {label}
      </Text>
      <Text className="text-sm font-semibold tabular-nums">{value}</Text>
    </View>
  );
}
