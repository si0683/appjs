import { expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { Inbox } from 'lucide-react-native';

import { EmptyState } from '@/components/app/empty-state';

it('пустое состояние показывает заголовок и подсказку', async () => {
  await render(<EmptyState icon={Inbox} title="Пусто" hint="Добавьте первую запись" />);
  expect(screen.getByText('Пусто')).toBeTruthy();
  expect(screen.getByText('Добавьте первую запись')).toBeTruthy();
});
