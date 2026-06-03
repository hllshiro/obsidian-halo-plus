# 贡献指南

感谢你对 Halo Plus 项目的关注！

[English](CONTRIBUTING.md)本文档将帮助你了解如何参与项目开发。

## 开发环境

### 环境要求

- Node.js 16+
- pnpm 8+

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/hllshiro/obsidian-halo-plus.git
cd obsidian-halo-plus

# 安装依赖
pnpm install

# 构建（生产模式）
pnpm build

# 开发模式（监听文件变化）
pnpm dev

# 代码检查
pnpm lint

# 代码检查 + 自动修复
pnpm lint:fix

# 代码格式化
pnpm format
```

### 部署到本地 Obsidian

创建 `.env` 文件，设置 `DEPLOY_TARGET_DIR` 指向你的 Obsidian 插件目录：

```bash
DEPLOY_TARGET_DIR=/path/to/your/vault/.obsidian/plugins/halo-plus
```

然后运行：

```bash
pnpm deploy:local
```

## 项目结构

```
src/
  main.ts                 # 插件入口，导出 HaloPlusPlugin（默认导出）
  halo-client.ts          # createHaloClient() — 封装 @halo-dev/api-client + axios
  types.ts                # 共享类型（HaloPost, HaloContent 等）
  content/
    frontmatter-parser.ts # parseFrontMatter / stringifyFrontMatter / generateSlug
    image-handler.ts      # 图片上传/Base64 处理
  renderer/
    preview-renderer.ts   # 通过无头组件将 Obsidian 笔记渲染为 HTML
    html-cleaner.ts       # 渲染后 HTML 清理
  sync/
    sync-manager.ts       # 同步逻辑
    folder-watcher.ts     # 文件监听器（用于自动同步）
  ui/
    settings-tab.ts       # 插件设置界面
    publish-preview-modal.ts  # 发布前预览模态框
    publish-modal.ts      # 发布模态框
    publish-loading.ts    # 加载指示器
    status-bar.ts         # 状态栏组件
  i18n/
    index.ts              # i18n 设置，使用 Obsidian 的 getLanguage()
    en.json / zh.json     # 翻译文件
```

## 构建工具链

- **esbuild** 打包 `src/main.ts` → `dist/main.js`（CJS, es2018）
- **Biome** 用于代码检查和格式化（非 ESLint/Prettier）
- TypeScript 仅用于类型检查，esbuild 负责转译
- `styles.css` 在构建时复制到 `dist/`（不打包）
- 外部依赖：`obsidian`、`electron`、所有 `@codemirror/*`、`@lezer/*`、Node 内置模块

## 代码规范

### Biome 规则

- `noExplicitAny`: **error** — 避免 `any`，使用正确类型
- `noUnusedImports` / `noUnusedVariables`: warn
- `noNonNullAssertion`: warn
- 单引号、尾逗号、2 空格缩进、100 字符行宽
- 仅检查 `.ts` 文件（忽略 `*.js`、`*.mjs`、`*.d.ts`）

### Pre-commit Hook

Husky pre-commit 运行 `biome check --write --staged`，自动修复并重新暂存文件。

## 提交规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 格式

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### 类型 (type)

- **feat**: 新功能
- **fix**: Bug 修复
- **docs**: 文档变更
- **style**: 代码格式（不影响代码运行的变更）
- **refactor**: 重构（既不是新增功能，也不是修改bug的代码变动）
- **perf**: 性能优化
- **test**: 增加测试
- **chore**: 构建过程或辅助工具的变动
- **ci**: CI 配置变更
- **revert**: 回滚

### 范围 (scope)

可选，表示影响范围：

- **publish**: 发布功能
- **settings**: 设置功能
- **sync**: 同步功能
- **renderer**: 渲染器
- **i18n**: 国际化
- **deploy**: 部署脚本
- **release**: 发布流程

### 描述 (description)

- 使用中文描述
- 简洁明示，说明做了什么
- 不超过 50 个字符

### 示例

```
feat(publish): 支持批量发布功能
fix(upload): 修复图片上传失败问题
docs(readme): 更新项目结构说明
style(css): 移除多余空行
refactor(publish): 用 Obsidian Notice 替代自定义 PublishLoading 组件
perf(renderer): 优化大量笔记的渲染性能
chore(release): 0.5.0
ci: 简化工作流，使用单一 Node 版本
```

## 版本发布

版本发布使用 `node scripts/release.js <version>` 脚本，自动：

1. 更新版本号（package.json, manifest.json, versions.json）
2. 创建 `chore(release): <version>` 提交
3. 创建 git tag（注释从 CHANGELOG.md 提取）
4. 推送到远程仓库

### CHANGELOG 要求

**发布前必须更新 CHANGELOG.md**，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)：

```markdown
## [0.6.1] - 2026-06-02

### Added
- 新增功能描述

### Changed
- 变更描述

### Fixed
- 修复描述
```

- 版本号使用 `## [x.x.x] - YYYY-MM-DD` 格式
- 按 Added / Changed / Deprecated / Removed / Fixed / Security 分类
- 只写用户可见的变更，不写内部重构细节
- `## [Unreleased]` 区域存放未发布的变更，发布时移入对应版本号

发布流程：

```bash
# 1. 更新 CHANGELOG.md，将 [Unreleased] 内容移入新版本号
# 2. 运行发布脚本
node scripts/release.js 0.6.1
```

## 注意事项

1. **修改 `package.json` 依赖后必须运行 `pnpm install` 更新 `pnpm-lock.yaml`**，否则 CI 会因 `--frozen-lockfile` 报错
2. 提交信息使用英文（type 和 description）
3. scope 使用英文小写
4. 每次提交只做一件事
5. 提交前确保代码通过 lint 检查
6. **NOT a monorepo.** 单一包位于仓库根目录
7. 根目录 `main.js` 是**构建产物**，不要直接编辑
8. `manifest.json` 和 `versions.json` 位于仓库根目录（Obsidian 要求）
9. `reference/` 目录被 gitignore，仅本地开发使用

## 相关文档

- [提交规范详细说明](docs/commit-convention.md)
- [自主规划框架](docs/superpowers/autonomous-planning-framework.md)
