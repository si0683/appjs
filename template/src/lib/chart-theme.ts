import { useUniwind } from 'uniwind';

// Цвета графиков. Skia и TradingView рисуют сами — им нужны настоящие цвета,
// а не классы Tailwind. Держите в паре с src/global.css.
const PALETTE = {
  light: {
    background: '#ffffff',
    text: '#71717a',
    grid: 'rgba(0,0,0,0.06)',
    border: '#e4e4e7',
    primary: '#7c3aed',
    up: '#16a34a',
    down: '#dc2626',
    series: ['#7c3aed', '#db2777', '#f59e0b', '#0ea5e9', '#10b981', '#64748b'],
  },
  dark: {
    background: '#0a0a0a',
    text: '#a1a1aa',
    grid: 'rgba(255,255,255,0.06)',
    border: '#27272a',
    primary: '#a78bfa',
    up: '#22c55e',
    down: '#f43f5e',
    series: ['#a78bfa', '#f472b6', '#fbbf24', '#38bdf8', '#34d399', '#94a3b8'],
  },
};

export type ChartTheme = (typeof PALETTE)['light'];

export function useChartTheme(): ChartTheme {
  const { theme } = useUniwind();
  return PALETTE[theme === 'dark' ? 'dark' : 'light'];
}

/** Прозрачность для HEX: withAlpha('#7c3aed', 0.3) → '#7c3aed4d'. */
export const withAlpha = (hex: string, alpha: number) =>
  hex +
  Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
