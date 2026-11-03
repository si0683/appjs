import {
  createSortedRowModel,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
  type RowData,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

// Таблица данных: сортировка по нажатию на заголовок, горизонтальная прокрутка
// для широких таблиц, числа выровнены вправо моноширинными цифрами.
// Логика — TanStack Table (фильтры, группировка, пагинация подключаются так же).

export type DataColumn<T extends RowData> = {
  id: string;
  title: string;
  /** Значение для сортировки (число или строка). */
  value: (row: T) => number | string;
  /** Как показать ячейку. По умолчанию — value. */
  render?: (row: T) => React.ReactNode;
  width: number;
  align?: 'left' | 'right';
};

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

export function DataTable<T extends RowData>({
  data,
  columns,
  initialSort,
  onRowPress,
  emptyText,
}: {
  data: T[];
  columns: DataColumn<T>[];
  initialSort?: { id: string; desc: boolean };
  onRowPress?: (row: T) => void;
  emptyText?: string;
}) {
  const defs = React.useMemo(
    () =>
      columns.map((c) => ({
        id: c.id,
        header: c.title,
        accessorFn: (row: T) => c.value(row),
      })),
    [columns]
  );

  const table = useTable({
    features,
    columns: defs,
    data,
    initialState: { sorting: initialSort ? [initialSort] : [] },
  });

  const byId = React.useMemo(() => Object.fromEntries(columns.map((c) => [c.id, c])), [columns]);
  const rows = table.getRowModel().rows;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="min-w-full">
      <View className="min-w-full">
        <View className="flex-row border-b border-border">
          {table.getHeaderGroups()[0].headers.map((h) => {
            const col = byId[h.column.id];
            const sorted = h.column.getIsSorted();
            return (
              <Pressable
                key={h.id}
                onPress={() => h.column.toggleSorting(sorted === 'asc')}
                style={{ width: col.width }}
                className={cn(
                  'flex-row items-center gap-1 px-2 py-2',
                  col.align === 'right' && 'justify-end'
                )}>
                <Text variant="muted" className="text-xs">
                  {col.title}
                </Text>
                {sorted ? (
                  <Icon
                    as={sorted === 'asc' ? ArrowUp : ArrowDown}
                    className="size-3 text-muted-foreground"
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {rows.length === 0 && emptyText ? (
          <Text variant="muted" className="p-4 text-center">
            {emptyText}
          </Text>
        ) : null}
        {rows.map((row) => (
          <Pressable
            key={row.id}
            disabled={!onRowPress}
            onPress={() => onRowPress?.(row.original)}
            className="flex-row border-b border-border/60 active:bg-muted">
            {columns.map((col) => (
              <View
                key={col.id}
                style={{ width: col.width }}
                className={cn('justify-center px-2 py-2.5', col.align === 'right' && 'items-end')}>
                {col.render ? (
                  col.render(row.original)
                ) : (
                  <Text className="text-sm tabular-nums" numberOfLines={1}>
                    {String(col.value(row.original))}
                  </Text>
                )}
              </View>
            ))}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
