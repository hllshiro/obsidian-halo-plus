# Contributing Guide

Thank you for your interest in the Halo Plus project!

[中文文档](CONTRIBUTING-zh.md) This document will help you understand how to participate in project development.

## Development Environment

### Requirements

- Node.js 16+
- pnpm 8+

### Local Development

```bash
# Clone repository
git clone https://github.com/hllshiro/obsidian-halo-plus.git
cd obsidian-halo-plus

# Install dependencies
pnpm install

# Build (production)
pnpm build

# Development mode (watch for changes)
pnpm dev

# Lint
pnpm lint

# Lint + auto-fix
pnpm lint:fix

# Format
pnpm format
```

### Deploy to Local Obsidian

Create a `.env` file with `DEPLOY_TARGET_DIR` pointing to your Obsidian plugins directory:

```bash
DEPLOY_TARGET_DIR=/path/to/your/vault/.obsidian/plugins/halo-plus
```

Then run:

```bash
pnpm deploy:local
```

## Project Structure

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

## Build Toolchain

- **esbuild** bundles `src/main.ts` → `dist/main.js` (CJS, es2018)
- **Biome** for lint + format (not ESLint/Prettier)
- TypeScript is type-check only; esbuild handles transpilation
- `styles.css` is copied to `dist/` during build (not bundled)
- Externals: `obsidian`, `electron`, all `@codemirror/*`, `@lezer/*`, Node builtins

## Code Style

### Biome Rules

- `noExplicitAny`: **error** — avoid `any`, use proper types
- `noUnusedImports` / `noUnusedVariables`: warn
- `noNonNullAssertion`: warn
- Single quotes, trailing commas, 2-space indent, 100 char line width
- Only lints `.ts` files (ignores `*.js`, `*.mjs`, `*.d.ts`)

### Pre-commit Hook

Husky pre-commit runs `biome check --write --staged` — auto-fixes and re-stages linted files.

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code formatting (changes that don't affect code execution)
- **refactor**: Refactoring (neither new feature nor bug fix)
- **perf**: Performance optimization
- **test**: Adding tests
- **chore**: Build process or auxiliary tool changes
- **ci**: CI configuration changes
- **revert**: Revert

### Scopes

Optional, indicates the scope of impact:

- **publish**: Publishing feature
- **settings**: Settings feature
- **sync**: Sync feature
- **renderer**: Renderer
- **i18n**: Internationalization
- **deploy**: Deploy scripts
- **release**: Release process

### Description

- Be concise and clear
- Explain what was done
- No more than 50 characters

### Examples

```
feat(publish): add batch publishing support
fix(upload): fix image upload failure
docs(readme): update project structure
style(css): remove extra blank lines
refactor(publish): replace custom PublishLoading with Obsidian Notice
perf(renderer): optimize rendering for large notes
chore(release): 0.5.0
ci: simplify workflow with single Node version
```

## Release Process

Version release uses `node scripts/release.js <version>` script, which automatically:

1. Updates version numbers (package.json, manifest.json, versions.json)
2. Creates `chore(release): <version>` commit
3. Creates git tag (with release notes from CHANGELOG.md)
4. Pushes to remote repository

### CHANGELOG Requirements

**CHANGELOG.md must be updated before releasing**, following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format:

```markdown
## [0.6.1] - 2026-06-02

### Added
- New feature description

### Changed
- Change description

### Fixed
- Fix description
```

- Version numbers use `## [x.x.x] - YYYY-MM-DD` format
- Categorized by Added / Changed / Deprecated / Removed / Fixed / Security
- Only write user-visible changes, not internal refactoring details
- `## [Unreleased]` section stores unreleased changes, moved to version number on release

Release workflow:

```bash
# 1. Update CHANGELOG.md, move [Unreleased] content to new version
# 2. Run release script
node scripts/release.js 0.6.1
```

## Important Notes

1. **After modifying `package.json` dependencies, you must run `pnpm install` to update `pnpm-lock.yaml`**, otherwise CI will fail with `--frozen-lockfile`
2. Commit messages use English (type and description)
3. Scope uses lowercase English
4. Each commit should only do one thing
5. Ensure code passes lint checks before committing
6. **NOT a monorepo.** Single package at repository root
7. Root `main.js` is a **generated build artifact**. Do not edit it directly
8. `manifest.json` and `versions.json` live at repository root (Obsidian requires this)
9. `reference/` directory is gitignored, for local development only

## Related Documents

- [Commit Convention Details](docs/commit-convention.md)
- [Autonomous Planning Framework](docs/superpowers/autonomous-planning-framework.md)
