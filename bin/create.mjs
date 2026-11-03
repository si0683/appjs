#!/usr/bin/env node
// create-appjs — copies the mobile app starter (Expo + Expo Router + React Native Reusables + Uniwind + …)
// into a new folder, names the app and installs its dependencies.
//
//   npm create appjs@latest my-app
//   npx create-appjs "My App" --id=ru.company.myapp --no-install --no-git

import { spawnSync } from "node:child_process"
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { basename, join, relative, resolve } from "node:path"
import { createInterface } from "node:readline/promises"
import { fileURLToPath } from "node:url"

const NAME = "AppJS"
const PACKAGE = "appjs"
const STACK = "Expo · Expo Router · React Native Reusables · Uniwind · Lucide · TanStack Query · zustand · Drizzle"
const DEFAULT_DIR = "my-app"

const TEMPLATE = fileURLToPath(new URL("../template", import.meta.url))
const SKIP = new Set(["node_modules", ".expo", "dist", "package-lock.json", "ios", "android", "expo-env.d.ts"])
const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))

const color = (code) => (text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text)
const bold = color(1)
const dim = color(2)
const green = color(32)
const red = color(31)
const magenta = color(35)

const args = process.argv.slice(2)
const flags = new Set()
let target
let appId
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === "--id") appId = args[++i]
  else if (arg.startsWith("--id=")) appId = arg.slice(5)
  else if (arg.startsWith("-")) flags.add(arg)
  else target ??= arg
}

if (flags.has("-h") || flags.has("--help")) {
  console.log(`
${bold(`create-${PACKAGE}`)} ${dim(version)}

  npm create ${PACKAGE}@latest ${dim("[folder]")} ${dim("[-- --id=<bundle id> --no-install --no-git]")}

  --id=<id>      app id for App Store / Google Play, e.g. ru.company.myapp (default: com.example.<name>)
  --no-install   do not run npm install
  --no-git       do not run git init
`)
  process.exit(0)
}

console.log(`\n${magenta(bold(NAME))} ${dim(version)} — ${STACK}\n`)

if (process.stdin.isTTY && !target) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  target = (await rl.question(`Папка проекта ${dim(`(${DEFAULT_DIR})`)}: `)).trim()
  rl.close()
}
target ||= DEFAULT_DIR

const root = resolve(target)
if (existsSync(root) && readdirSync(root).length > 0) {
  console.error(red(`Папка «${target}» не пуста. Укажите новую папку.`))
  process.exit(1)
}

const folder = basename(root)
const slug = toSlug(folder)
const id = appId ?? `com.example.${slug.replace(/-/g, "")}`
if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(id)) {
  console.error(red(`Неверный --id «${id}». Пример: ru.company.myapp`))
  process.exit(1)
}

cpSync(TEMPLATE, root, {
  recursive: true,
  filter: (source) => !SKIP.has(basename(source)),
})
// npm never publishes a file called .gitignore, so the template keeps it as _gitignore
renameSync(join(root, "_gitignore"), join(root, ".gitignore"))

// package.json: the project name
const pkgPath = join(root, "package.json")
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
pkg.name = slug
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")

// app.json: the name under the icon, the link scheme and the store ids
const appPath = join(root, "app.json")
const app = JSON.parse(readFileSync(appPath, "utf8"))
app.expo.name = toTitle(folder)
app.expo.slug = slug
app.expo.scheme = slug.replace(/-/g, "")
app.expo.ios.bundleIdentifier = id
app.expo.android.package = id.replace(/-/g, "_")
writeFileSync(appPath, JSON.stringify(app, null, 2) + "\n")

console.log(`${green("✔")} Проект создан: ${bold(root)}`)
console.log(`${green("✔")} Приложение «${app.expo.name}», id ${id}`)

const agent = (process.env.npm_config_user_agent ?? "npm").split("/")[0]
const pm = ["pnpm", "yarn", "bun"].includes(agent) ? agent : "npm"

let installed = false
if (!flags.has("--no-install")) {
  console.log(`${dim("…")} Устанавливаю зависимости (${pm} install), это займёт пару минут\n`)
  installed = run(pm, ["install"], root)
  console.log(installed ? `\n${green("✔")} Зависимости установлены` : red("✖ Установка не удалась — запустите её вручную"))
}

if (!flags.has("--no-git") && run("git", ["--version"], root, true)) {
  if (run("git", ["init", "-q"], root, true)) console.log(`${green("✔")} Git-репозиторий создан`)
}

const cd = relative(process.cwd(), root) || "."
console.log(`
${bold("Дальше:")}
  cd ${cd.includes(" ") ? `"${cd}"` : cd}${installed ? "" : `\n  ${pm} install`}
  ${pm} start            ${dim("# QR-код → откройте в Expo Go на телефоне (одна Wi-Fi сеть)")}
  ${pm} run tunnel       ${dim("# то же через интернет, если Wi-Fi/брандмауэр мешают")}
  ${pm} run check        ${dim("# типы, линтер, тесты — перед коммитом")}

Сборка для магазинов (без Mac): ${pm} run build:preview → ${pm} run build:prod → ${pm} run submit
Как устроен проект и рецепты: README.md
`)

function run(command, commandArgs, cwd, quiet = false) {
  const options = { cwd, stdio: quiet ? "ignore" : "inherit" }
  // npm, pnpm and yarn are .cmd files on Windows and need a shell (fixed arguments only)
  const result =
    process.platform === "win32"
      ? spawnSync([command, ...commandArgs].join(" "), { ...options, shell: true })
      : spawnSync(command, commandArgs, options)
  return result.status === 0
}

function toSlug(name) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || DEFAULT_DIR
  )
}

function toTitle(name) {
  const words = name.trim().split(/[\s_-]+/).filter(Boolean)
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || "My App"
}
