# AGENTS.md

## Project Overview

Single-package Obsidian plugin (`halo-plus`) that publishes notes to Halo blog with native rendering (Dataview, Tasks, Callout, etc.). Entry point: `src/main.ts` → exports `HaloPlusPlugin`.

## Commands

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Build (production) | `pnpm build` |
| Dev (watch mode) | `pnpm dev` |
| Lint | `pnpm lint` |
| Lint + auto-fix | `pnpm lint:fix` |
| Format | `pnpm format` |
| Deploy locally | `pnpm deploy:local` (requires `DEPLOY_TARGET_DIR` in `.env`) |
| Release | `node scripts/release.js <version>` (e.g. `node scripts/release.js 0.4.0`) |

**No test suite.** Do not run `pnpm test` — no script is defined.

## Build Toolchain

- **esbuild** bundles `src/main.ts` → `dist/main.js` (CJS, es2018). Config: `esbuild.config.mjs`
- **Biome** for lint + format (not ESLint/Prettier). Config: `biome.json`
- TypeScript is type-check only; esbuild handles transpilation. No `tsc` build step.
- `styles.css` is copied to `dist/` during build (not bundled).
- Externals: `obsidian`, `electron`, all `@codemirror/*`, `@lezer/*`, Node builtins

## Lint Rules (Biome)

- `noExplicitAny`: **error** — avoid `any`, use proper types
- `noUnusedImports` / `noUnusedVariables`: warn
- `noNonNullAssertion`: warn
- Single quotes, trailing commas, 2-space indent, 100 char line width
- Only lints `.ts` files (ignores `*.js`, `*.mjs`, `*.d.ts`)

## Pre-commit Hook

Husky pre-commit runs `biome check --write --staged` — auto-fixes and re-stages linted files. No manual `git add` needed after lint:fix.

## Source Structure

```
src/
  main.ts                 # Plugin entry, exports HaloPlusPlugin (default export)
  halo-client.ts          # createHaloClient() — wraps @halo-dev/api-client + axios
  types.ts                # Shared types (HaloPost, HaloContent, etc.)
  content/
    frontmatter-parser.ts # parseFrontMatter / stringifyFrontMatter / generateSlug
    image-handler.ts      # Image upload/base64 processing
  renderer/
    preview-renderer.ts   # Renders Obsidian note to HTML via headless component
    html-cleaner.ts       # Post-render HTML cleanup
  sync/
    sync-manager.ts       # Sync logic
    folder-watcher.ts     # File watcher for auto-sync
  ui/
    settings-tab.ts       # Plugin settings UI
    publish-preview-modal.ts  # Pre-publish preview modal
    publish-modal.ts      # Publish modal
    publish-loading.ts    # Loading indicator
    status-bar.ts         # Status bar widget
  i18n/
    index.ts              # i18n setup, uses Obsidian's getLanguage()
    en.json / zh.json     # Translations
```

## Halo API 调用指南

项目通过 `src/halo-client.ts` 的 `createHaloClient()` 封装 `@halo-dev/api-client`，返回三个 API 客户端和一个 axios 实例：

- `client.consoleApi` — 管理端 API（需认证），对应 `reference/halo-restful-api/apis_console.api_v1alpha1.json`
- `client.coreApi` — 核心 API（CRD 操作），对应 `reference/halo-restful-api/apis_extension.api_v1alpha1.json`
- `client.publicApi` — 公开 API，对应 `reference/halo-restful-api/apis_public.api_v1alpha1.json`
- `client.httpClient` — 原始 axios 实例，用于 SDK 未封装的端点（如 UC API）

**查找 API 调用方式的流程：**
1. 在 `reference/halo-restful-api/` 对应的 JSON 文件中找到目标端点和请求/响应结构
2. 在 `node_modules/@halo-dev/api-client/` 的 `index.d.ts` 中查找对应的 TypeScript 类型和方法签名
3. 如需确认调用方式，参考 `node_modules/@halo-dev/api-client/README.md` 中的用法示例

对于 SDK 未封装的 UC API 端点（如 `uc.api.content.halo.run`），直接使用 `client.httpClient.get/put/post` 调用。

## Release Process

`node scripts/release.js <version>` does:
1. Validates version is `x.x.x` format (no `v` prefix — Obsidian rejects it)
2. Updates `manifest.json`, `versions.json`, `package.json` in sync
3. Commits as `chore(release): <version>`, creates git tag, pushes

Version must match across `manifest.json` and `package.json`.

## Environment

`.env` (gitignored) for local dev only:
- `DEPLOY_TARGET_DIR` — target path for `pnpm deploy:local`

## Gotchas

- **NOT a monorepo.** Single package at repo root. No `pnpm-workspace.yaml` or `packages/` dir.
- Root `main.js` is a **generated build artifact**. Do not edit it directly.
- `manifest.json` and `versions.json` live at repo root (Obsidian requires this).
- `.gitignore` excludes `*.js` at root but allows `esbuild.config.mjs`, `version-bump.mjs`, `scripts/*.js` via negation.
- `version-bump.mjs` is an npm version lifecycle hook (`npm version`). Prefer `scripts/release.js` for releasing.
- `reference/` 目录（API 文档、参考仓库）被 gitignore，仅本地开发使用。`docs/superpowers/` 是内部规划文档。
