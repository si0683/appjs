// Проверка проекта по требованиям магазинов перед публикацией: npm run store:check
// Правила и официальные ссылки — STORES.md. Ошибки (✖) мешают публикации,
// предупреждения (!) — проверьте вручную. Выход с кодом 1, если есть ошибки.
import { existsSync, readFileSync } from 'node:fs';

const app = JSON.parse(readFileSync('app.json', 'utf8')).expo;
const eas = existsSync('eas.json') ? JSON.parse(readFileSync('eas.json', 'utf8')) : {};
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

const errors = [];
const warnings = [];
const ok = [];
const check = (cond, okText, failText, level = 'error') => {
  if (cond) ok.push(okText);
  else (level === 'error' ? errors : warnings).push(failText);
};

/** Ширина и высота PNG из заголовка файла (без зависимостей). */
function pngSize(path) {
  if (!existsSync(path)) return null;
  const b = readFileSync(path);
  if (b.toString('ascii', 1, 4) !== 'PNG') return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: b[25] === 6 || b[25] === 4 };
}

// --- Название и id
check(
  app.name && [...app.name].length <= 30,
  `Название «${app.name}» — до 30 символов`,
  `Название «${app.name}» длиннее 30 символов (Google Play, App Store)`
);
check(
  !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(app.name ?? ''),
  'В названии нет эмодзи',
  'В названии есть эмодзи — Google Play запрещает'
);
for (const [label, id] of [
  ['iOS bundleIdentifier', app.ios?.bundleIdentifier],
  ['Android package', app.android?.package],
]) {
  check(!!id, `${label} задан`, `${label} не задан в app.json`);
  check(
    !!id && !id.startsWith('com.example.'),
    `${label}: ${id}`,
    `${label} «${id}» — замените com.example на свой домен (потом id не меняется)`,
    'warning'
  );
}
check(
  /^\d+\.\d+\.\d+$/.test(app.version ?? ''),
  `Версия ${app.version}`,
  'version в app.json — вида 1.0.0'
);

// --- Иконки
const icon = pngSize(app.icon ?? '');
check(!!icon, 'Иконка — PNG', `Иконка ${app.icon} не найдена или не PNG`);
if (icon) {
  check(
    icon.w === 1024 && icon.h === 1024,
    'Иконка 1024×1024 (App Store)',
    `Иконка ${icon.w}×${icon.h} — App Store требует 1024×1024`,
    'warning'
  );
  check(
    !icon.alpha,
    'Иконка без прозрачности',
    'Иконка с прозрачным каналом — App Store и RuStore требуют непрозрачный фон',
    'warning'
  );
}
check(
  !!app.android?.adaptiveIcon?.foregroundImage &&
    existsSync(app.android.adaptiveIcon.foregroundImage),
  'Адаптивная иконка Android',
  'Нет android.adaptiveIcon.foregroundImage'
);

// --- iOS
check(
  app.ios?.config?.usesNonExemptEncryption !== undefined,
  'Экспортное шифрование указано (ios.config.usesNonExemptEncryption)',
  'Укажите ios.config.usesNonExemptEncryption (иначе вопрос при каждой загрузке в App Store Connect)',
  'warning'
);

// --- Политика и удаление аккаунта
const extra = app.extra ?? {};
check(
  /^https:\/\//.test(extra.privacyPolicyUrl ?? ''),
  'Политика конфиденциальности: ' + extra.privacyPolicyUrl,
  'Нет expo.extra.privacyPolicyUrl (https://…) — нужна всем магазинам; RuStore — на русском и внутри приложения',
  'warning'
);
const hasAuth = existsSync('src/stores/auth.ts') || existsSync('src/app/sign-in.tsx');
if (hasAuth) {
  check(
    /deleteAccount/.test(read('src/stores/auth.ts')),
    'Удаление аккаунта в приложении есть',
    'Есть вход, но нет удаления аккаунта — обязательно для App Store и Google Play'
  );
  check(
    /^https:\/\//.test(extra.deleteAccountUrl ?? ''),
    'Страница удаления аккаунта: ' + extra.deleteAccountUrl,
    'Нет expo.extra.deleteAccountUrl — Google Play требует удаление аккаунта и по ссылке в интернете',
    'warning'
  );
}

// --- Сборка
const prodAndroid = eas.build?.production?.android ?? {};
check(
  prodAndroid.buildType !== 'apk',
  'Production для Android — AAB (Google Play)',
  'eas.json: production собирает APK — Google Play принимает только AAB'
);
check(
  eas.build?.production?.autoIncrement === true,
  'Номер сборки растёт сам (autoIncrement)',
  'eas.json: включите production.autoIncrement — магазины не принимают повтор номера сборки',
  'warning'
);
const expoMajor = Number((pkg.dependencies?.expo ?? '').replace(/[^\d.]/g, '').split('.')[0]);
check(
  expoMajor >= 58,
  `Expo SDK ${expoMajor}: Android targetSdk 36 — требование Google Play с 31.08.2026`,
  `Expo SDK ${expoMajor} — обновите до SDK 58+, чтобы targetSdk был 36 (Google Play с 31.08.2026)`,
  'warning'
);

// --- Отчёт
const line = (mark, text) => console.log(`${mark} ${text}`);
console.log('\nПроверка по требованиям магазинов (подробно — STORES.md)\n');
ok.forEach((t) => line('✔', t));
warnings.forEach((t) => line('!', t));
errors.forEach((t) => line('✖', t));
const plural = (n, one, few, many) =>
  n % 10 === 1 && n % 100 !== 11
    ? one
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
      ? few
      : many;
console.log(
  `\n${errors.length} ${plural(errors.length, 'ошибка', 'ошибки', 'ошибок')}, ` +
    `${warnings.length} ${plural(warnings.length, 'предупреждение', 'предупреждения', 'предупреждений')}. ` +
    'Перед отправкой пройдите и ручной чек-лист в STORES.md.\n'
);
process.exit(errors.length ? 1 : 0);
