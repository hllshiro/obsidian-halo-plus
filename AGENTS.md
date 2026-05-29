# AGENTS.md

## Project Overview

Obsidian plugin that publishes notes to Halo blog with native rendering (Dataview, Tasks, Callout, etc.). Monorepo with 3 packages managed by pnpm workspaces.

## Monorepo Structure

```
packages/
  halo-sdk/           # @obsidian-halo-plus/halo-sdk — wraps @halo-dev/api-client
  obsidian-halo-plus/ # Main Obsidian plugin (entry: src/main.ts)
  halo-cli/           # @obsidian-halo-plus/halo-cli — CLI tool
```

Internal dependency: plugin and CLI both depend on `halo-sdk` via `workspace:*`.

## Commands

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Build all | `pnpm build` |
| Build SDK only | `pnpm build:sdk` |
| Build plugin only | `pnpm build:plugin` |
| Build CLI only | `pnpm build:cli` |
| Dev (watch mode) | `pnpm dev` |
| Lint | `pnpm lint` |
| Lint + auto-fix | `pnpm lint:fix` |
| Format | `pnpm format` |
| Release | `pnpm release <version>` (e.g. `pnpm release 0.4.0`) |

**No test suite exists.** CI references `pnpm test` but no test script is defined — it will fail if run.

## Build Toolchain

- **esbuild** for all bundling (not tsc). Each package has its own esbuild invocation in `package.json` scripts.
- **Biome** for lint + format (not ESLint/Prettier). Config at `biome.json`.
- TypeScript is used for type-checking only; esbuild handles transpilation.

### Plugin Build Specifics

- Entry: `packages/obsidian-halo-plus/src/main.ts`
- Output: `packages/obsidian-halo-plus/dist/main.js` (CJS, es2018 target)
- Externalized: `obsidian`, `electron`, all `@codemirror/*`, `@lezer/*`
- `styles.css` is copied to `dist/` during build (not bundled)

### SDK Build Specifics

- Produces dual CJS (`dist/index.js`) and ESM (`dist/index.mjs`) outputs
- Externalizes `@halo-dev/api-client` and `axios` (peer/runtime deps)

## Lint Rules (Biome)

- `noExplicitAny`: **error** — avoid `any`, use proper types
- `noUnusedImports` / `noUnusedVariables`: warn
- `noNonNullAssertion`: warn
- Single quotes, trailing commas, 2-space indent, 100 char line width
- `biome.json` ignores `*.js`, `*.mjs`, `*.d.ts` files (only lints `.ts`)

## Release Process

Triggered by git tags. Release workflow:

1. Validates version consistency: `packages/obsidian-halo-plus/package.json` version must match root `manifest.json` version and the git tag
2. Builds all packages
3. Publishes `main.js`, `manifest.json`, `styles.css` as GitHub Release assets

**Version Format:** Git tags and versions must be pure numeric `x.x.x` format (e.g., `1.0.0`). Do NOT prefix with `v`. Obsidian does not accept `v`-prefixed version strings.

Update version in both `package.json` and `manifest.json` before tagging.

## Key Files

- `packages/obsidian-halo-plus/src/main.ts` — plugin entry, exports `HaloPlusPlugin`
- `packages/halo-sdk/src/client.ts` — `HaloClient` class, wraps axios + @halo-dev/api-client
- `packages/obsidian-halo-plus/esbuild.config.mjs` — plugin bundler config
- `manifest.json` and `versions.json` (root) — Obsidian plugin metadata, maintained directly at repo root
- `biome.json` — lint/format config

## Gotchas

- Root `main.js` is a **generated artifact** (build output). Do not edit it directly.
- Root `manifest.json` and `versions.json` are **maintained at repo root** as the source of truth (Obsidian requires manifest.json at root).
- `.gitignore` excludes `*.js` at root but explicitly allows specific files via negation patterns — check before adding new `.js` files.
- `test.sh` is a local-only deploy script (hardcoded Windows/WSL path), not a test suite.
- `reference/` and `.omo/` directories are internal/planning — excluded from git.
- **Pre-commit hook** runs `pnpm lint:fix && git add -u` automatically. Staged files get auto-fixed and re-staged.
