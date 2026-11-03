const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Миграции Drizzle — это .sql-файлы, их нужно пускать в сборку.
config.resolver.sourceExts.push('sql');

// SQLite в браузере работает через WebAssembly и требует этих заголовков (только для веб-версии).
config.resolver.assetExts.push('wasm');
const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, metroServer) => {
  const enhanced = enhanceMiddleware ? enhanceMiddleware(middleware, metroServer) : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return enhanced(req, res, next);
  };
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './uniwind-types.d.ts',
});
