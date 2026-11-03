# AGENTS.md — rules for AI coding agents

AppJS is a **project starter**: the npm package `create-appjs` copies `template/` (Expo SDK 58 + Expo Router + React Native Reusables + Uniwind + Lucide + TanStack Query + zustand + react-hook-form/zod + Drizzle/expo-sqlite + i18next) into a new folder, names the app and runs `npm install`.

- `bin/create.mjs` — the CLI, Node ≥ 20.19, no dependencies (same style as create-gamemonsterjs*/create-lightwebsiteui). It renames `template/_gitignore` → `.gitignore` (npm never publishes `.gitignore`) and writes the folder name into `package.json` (`name`) and `app.json` (`name`, `slug`, `scheme`, `ios.bundleIdentifier`, `android.package`; `--id` overrides the store id).
- `template/` — a working app. Work on it in place: `cd template && npm install && npm start`. `template/AGENTS.md` is the guide for agents in the user's project — keep it in sync with the code.
- Everything in the template must run in **Expo Go** (the user tests on an iPhone from Windows through `npm run tunnel`). A library with native code outside the Expo SDK goes to the docs as a recipe, not into the template.
- Add packages with `npx expo install` (SDK-compatible versions). UI components come from the Reusables Uniwind registry: `npx shadcn@latest add https://reactnativereusables.com/r/uniwind/<name>.json`. Upstream fix kept in `input.tsx`/`textarea.tsx`: `placeholderClassName` (NativeWind) → `placeholderTextColorClassName="accent-muted-foreground"` (Uniwind).
- Web is a debugging target only. expo-sqlite on web needs COOP/COEP; the Expo dev server does not send them for `/`, so `src/db/client.ts` reloads once via `/index.html` and `+not-found.tsx` redirects it back to `/`.
- UI texts Russian (+ English dictionary), code comments Russian in the template (the user's project), English in `bin/`.
- Before a release: in `template/` run `npm run check` and `npx expo export --platform android --platform ios`; then `npm pack`, `npx ./create-appjs-<v>.tgz "Test App"` in a temp folder, `npm run check` there and open it in Expo Go / `npm run web`.
- Versions: `version` in package.json + CHANGELOG.md + tag `vX.Y.Z`.
- `index.html` in the root is the GitHub Pages page: only a short install guide and the stack table, one screen without scrolling, Inter font.
- `PROMT.md` (Russian fill-in brief for AI assistants) lives in the root and as `template/PROMT.md` — keep both copies identical.
