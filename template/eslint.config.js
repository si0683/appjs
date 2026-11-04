const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'src/db/migrations/*', 'uniwind-types.d.ts', 'server/*', 'supabase/functions/*'] },
]);
