// Копирует движок Skia для браузера (CanvasKit, WebAssembly) в public/.
// Нужен только веб-версии графиков; запускается сам после npm install.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
try {
  const src = join(
    dirname(require.resolve('canvaskit-wasm/package.json')),
    'bin/full/canvaskit.wasm'
  );
  if (!existsSync('public')) mkdirSync('public');
  copyFileSync(src, 'public/canvaskit.wasm');
} catch (e) {
  console.warn('[skia-web] canvaskit.wasm не скопирован:', e.message);
}
