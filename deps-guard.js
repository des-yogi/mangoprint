#!/usr/bin/env node

/**
 * Локальный сторож зависимостей:
 * - читает package.json;
 * - проверяет lifecycle-скрипты (preinstall/install/postinstall/prepare);
 * - проверяет, нет ли зависимостей из чёрного списка.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = process.cwd();
const PACKAGE_JSON = path.join(REPO_ROOT, "package.json");

// Чёрный список пакетов (можно расширять)
const BLOCKED_PACKAGES = [
  { name: "shai-hulud", reason: "Known worm package" },
  { name: "@shai-hulud/core", reason: "Shai-Hulud related" },
  { name: "lodash-ts-fixer", reason: "Typosquat / suspicious" }
];

const RISKY_SCRIPTS = ["preinstall", "install", "postinstall", "prepare"];

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.error(`[ERROR] Не удалось прочитать ${filePath}:`, e.message);
    return null;
  }
}

function main() {
  console.log("=== deps-guard: проверка после npm install/update ===");

  const pkg = loadJson(PACKAGE_JSON);
  if (!pkg) {
    console.log("[INFO] package.json не найден, ничего не проверяю.");
    process.exit(0);
  }

  const findings = [];

  // 1) lifecycle-скрипты
  const scripts = pkg.scripts || {};
  let foundScripts = RISKY_SCRIPTS.filter((s) => scripts[s]);

  // Специальное правило: не считаем проблемой наш служебный postinstall
  if (scripts.postinstall && scripts.postinstall.trim() === "npm run deps:guard") {
    foundScripts = foundScripts.filter((s) => s !== "postinstall");
  }

  if (foundScripts.length > 0) {
    findings.push({
      type: "lifecycle-scripts",
      details: {
        scripts: foundScripts.reduce((acc, s) => {
          acc[s] = scripts[s];
          return acc;
        }, {})
      }
    });
  }

  // 2) зависимоти из чёрного списка
  const depSections = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies"
  ];

  const allDeps = [];

  for (const section of depSections) {
    const deps = pkg[section];
    if (!deps) continue;
    for (const [name, versionRange] of Object.entries(deps)) {
      allDeps.push({ section, name, versionRange });
    }
  }

  for (const dep of allDeps) {
    const blocked = BLOCKED_PACKAGES.find((b) => b.name === dep.name);
    if (blocked) {
      findings.push({
        type: "blocked-package",
        details: {
          section: dep.section,
          name: dep.name,
          versionRange: dep.versionRange,
          reason: blocked.reason
        }
      });
    }
  }

  if (findings.length === 0) {
    console.log("[OK] Подозрительных lifecycle-скриптов и пакетов из чёрного списка не найдено.");
    process.exit(0);
  }

  console.log(`[WARN] Обнаружены потенциальные проблемы: ${findings.length}`);

  for (const f of findings) {
    if (f.type === "lifecycle-scripts") {
      console.log("  [scripts] Найдены lifecycle-скрипты:");
      for (const [k, v] of Object.entries(f.details.scripts)) {
        console.log(`    - ${k}: ${v}`);
      }
    } else if (f.type === "blocked-package") {
      const d = f.details;
      console.log(
        `  [blocked] ${d.section}: ${d.name}@${d.versionRange} — ${d.reason}`
      );
    }
  }

  // режим: только предупреждаем, не ломаем команду
  process.exit(0);
}

main();
