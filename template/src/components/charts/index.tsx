// Графики. Импортируйте только отсюда: '@/components/charts'.
// В браузере те же компоненты подгружаются после WebAssembly-движка Skia
// (см. index.web.tsx); на телефоне Skia уже встроен.
export { AreaChart, type AreaPoint } from './area-chart';
export { BarChart, type BarPoint } from './bar-chart';
export { PieChart, type PieSlice } from './pie-chart';
export { Sparkline } from './sparkline';
export { default as CandleChart } from './candle-chart';
