# Halo Plus

> Publish notes to Halo blog with native rendering support for all plugins (Dataview, Tasks, Callout, etc.)

[![GitHub release](https://img.shields.io/github/v/release/hllshiro/obsidian-halo-plus)](https://github.com/hllshiro/obsidian-halo-plus/releases)
[![GitHub](https://img.shields.io/github/license/hllshiro/obsidian-halo-plus)](LICENSE)

[中文文档](README-zh.md)

## Features

- **Native Rendering**: Captures fully rendered HTML from Obsidian, supporting all installed plugins
- **One-Click Publishing**: Command palette or right-click menu for quick publishing to Halo
- **Auto Sync**: Configure folders to auto-publish on save
- **Image Processing**: Upload to Halo or embed as Base64
- **Offline Support**: Pure local execution, no external dependencies
- **Article Management**: Publish, update, and delete articles

## Installation

### Install from Community Plugins (Recommended)

1. Open Obsidian Settings → Community Plugins → Browse
2. Search for "Halo Plus"
3. Click Install, then Enable

### Manual Installation (Offline)

1. Download `main.js`, `manifest.json`, `styles.css` from [GitHub Releases](https://github.com/hllshiro/obsidian-halo-plus/releases)
2. Copy these three files to `{vault}/.obsidian/plugins/halo-plus/`
3. Enable "Halo Plus" in Obsidian Settings → Community Plugins

## Quick Start

### 1. Configure Halo Site

1. Open Obsidian Settings → Halo Plus
2. Click "Add Site"
3. Fill in:
   - **Site Name**: My Blog
   - **Site URL**: https://halo.example.com
   - **API Token**: Create in Halo Dashboard → Personal Center → Personal Access Tokens
4. Click "Test Connection" to verify

### 2. Publish Notes

1. Edit your note and set metadata in FrontMatter:

```yaml
---
title: "My Article Title"
tags:
  - "Tech"
  - "Obsidian"
categories:
  - "Blog"
---
```

2. Publish via:
   - Command Palette: `Ctrl/Cmd + P` → type "Halo Plus: Publish to Halo"
   - Right-click menu: Right-click in editor → "Publish to Halo"

### 3. Auto Sync

1. Enable "Folder Sync" in settings
2. Add folder paths to sync
3. Notes auto-publish after editing and saving

## Configuration

### Site Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| Site Name | Display name | - |
| Site URL | Halo server URL | - |
| API Token | Personal access token | - |
| Default Site | Whether this is the default publish site | false |

### Publishing Behavior

| Setting | Description | Default |
|---------|-------------|---------|
| Auto Publish | Auto publish after creating article | true |
| Skip Preview | Publish without confirmation dialog | false |
| Clean Temp Files | Clean temp files after rendering | true |

### Image Processing

| Setting | Description | Default |
|---------|-------------|---------|
| Default Mode | Upload to Halo / Embed as Base64 | upload |
| Base64 Quality | 0-100 | 80 |

## FrontMatter Properties

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `title` | string | Article title | No (defaults to filename) |
| `slug` | string | URL slug | No (auto-generated) |
| `tags` | string[] | Tag list | No |
| `categories` | string[] | Category list | No |
| `cover` | string | Cover image URL | No |
| `excerpt` | string | Article excerpt | No |
| `date` | string | Publish time | No (defaults to creation time) |

### Halo Tracking Fields (Auto-managed)

| Property | Description |
|----------|-------------|
| `halo.site` | Associated Halo site URL |
| `halo.name` | Halo article ID |
| `halo.publish` | Whether published |

## Development

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

# Build all packages
pnpm build

# Development mode (watch for changes)
pnpm dev
```

### Project Structure

```
obsidian-halo-plus/
├── packages/
│   ├── halo-sdk/              # Halo REST API SDK
│   ├── obsidian-halo-plus/    # Obsidian plugin
│   └── halo-cli/              # CLI tool
├── pnpm-workspace.yaml
└── package.json
```

## License

[MIT](LICENSE)

## Acknowledgments

- [obsidian-halo](https://github.com/halo-sigs/obsidian-halo) - Original plugin reference
- [Obsidian](https://obsidian.md) - Excellent note-taking app
- [Halo](https://halo.run) - Powerful blogging platform
