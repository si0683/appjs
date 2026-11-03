module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Миграции Drizzle (.sql) импортируются как строки.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
