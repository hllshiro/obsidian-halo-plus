# AGENTS.md

## 项目概述

单包 Obsidian 插件（`halo-plus`），将笔记发布到 Halo 博客，支持原生渲染（Dataview、Tasks、Callout 等）。入口：`src/main.ts` → 导出 `HaloPlusPlugin`。

## 常用命令

| 用途 | 命令 |
|------|---------|
| 安装依赖 | `pnpm install` |
| 生产构建 | `pnpm build` |
| 开发模式（watch） | `pnpm dev` |
| 代码检查 | `pnpm lint` |
| 检查 + 自动修复 | `pnpm lint:fix` |
| 格式化 | `pnpm format` |
| 本地部署 | 开发模式下自动部署（需在 `.env` 中设置 `DEPLOY_TARGET_DIR`） |
| 发布版本 | `node scripts/release.js <version>`（如 `node scripts/release.js 0.4.0`） |

**无测试套件。** 不要运行 `pnpm test` — 未定义该脚本。

CI 流程：`pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm build`。推送前用相同顺序本地验证。

## 构建工具链

- **esbuild** 打包 `src/main.ts` → `dist/main.js`（CJS, es2018），配置：`esbuild.config.mjs`
- esbuild 仅将 `obsidian` 标记为 external（不是 electron、codemirror 等）
- **Biome** 负责 lint + 格式化（非 ESLint/Prettier），配置：`biome.json`
- TypeScript 仅用于类型检查，esbuild 负责转译，无 `tsc` 构建步骤
- `styles.css` 构建时复制到 `dist/`（不打包）
- 开发模式（`pnpm dev`）启用 esbuild watch

## Lint 规则（Biome）

- `noExplicitAny`: **error** — 禁止 `any`，使用正确类型
- `noUnusedImports` / `noUnusedVariables`: warn
- `noNonNullAssertion`: warn
- 单引号、尾逗号、2 空格缩进、100 字符行宽
- 仅检查 `.ts` 文件（忽略 `*.js`、`*.mjs`、`*.d.ts`）

## Pre-commit Hook

Husky pre-commit 仅在暂存区有 `.ts` 文件时运行 `biome check --write --staged`，自动修复并重新暂存。lint:fix 后无需手动 `git add`。

## 源码结构

```
src/
  main.ts                 # 插件入口，导出 HaloPlusPlugin（默认导出）
  halo-client.ts          # createHaloClient() — 封装 @halo-dev/api-client + axios
  types.ts                # 共享类型（HaloPost, HaloContent 等）
  content/
    frontmatter-parser.ts # parseFrontMatter / stringifyFrontMatter / generateSlug
    image-handler.ts      # 图片上传/Base64 处理
  renderer/
    preview-renderer.ts   # 通过无头组件将笔记渲染为 HTML
    html-cleaner.ts       # 渲染后 HTML 清理
  sync/
    sync-manager.ts       # 同步逻辑
    folder-watcher.ts     # 文件监听器（自动同步）
  service/
    tag-category-service.ts # 标签/分类名称解析与自动创建
  ui/
    settings-tab.ts       # 插件设置界面
    publish-preview-modal.ts  # 发布前预览模态框
    publish-modal.ts      # 发布模态框
    publish-loading.ts    # 加载指示器
    status-bar.ts         # 状态栏组件
  utils/
    logger.ts             # Logger 工具类（verbose 模式控制）
  i18n/
    index.ts              # i18n 设置，使用 Obsidian 的 getLanguage()
    en.json / zh.json     # 翻译文件
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

## 提交规范

Conventional Commits 格式：`<type>(<scope>): <description>`

- 类型：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`chore`、`ci`、`revert`
- 范围：`publish`、`settings`、`sync`、`renderer`、`i18n`、`deploy`、`release`
- 描述使用中文，≤50 字符
- 完整规范见 `docs/commit-convention.md`

## 版本发布

`node scripts/release.js <version>` 执行：
1. 验证版本号为 `x.x.x` 格式（不带 `v` 前缀 — Obsidian 会拒绝）
2. 同步更新 `manifest.json`、`versions.json`、`package.json`
3. 暂存 `manifest.json`、`versions.json`、`package.json`、`pnpm-lock.yaml`、`CHANGELOG.md`
4. 提交 `chore(release): <version>`，创建 git tag（从 CHANGELOG 提取 release notes），推送

版本号必须在 `manifest.json`、`package.json`、git tag 三处一致，CI 会强制校验。

**发布前必须更新 CHANGELOG.md**，将 `[Unreleased]` 内容移入新版本号。

**CHANGELOG 编写规范：**
- 站在用户角度描述变更，说明「对用户有什么影响」而非「改了什么代码」
- 避免技术术语和实现细节，使用通俗易懂的表达
- 示例：
  - ✓「日志输出现在遵循 verbose 设置，非调试模式下控制台更简洁」
  - ✗「log/warn/error 方法添加 isVerbose() 条件判断」

## 环境变量

`.env`（已 gitignore）仅用于本地开发：
- `DEPLOY_TARGET_DIR` — 开发模式（`pnpm dev`）自动部署到此路径

## 注意事项

- **非 monorepo。** 单包位于仓库根目录，无 `pnpm-workspace.yaml` 或 `packages/` 目录。
- 根目录 `main.js` 是**构建产物**，不要直接编辑。
- `manifest.json` 和 `versions.json` 位于仓库根目录（Obsidian 要求）。
- `.gitignore` 排除根目录的 `*.js`、`*.mjs`、`*.d.ts`，但通过取反规则允许 `esbuild.config.mjs`、`version-bump.mjs`、`scripts/*.js`。
- `version-bump.mjs` 是 npm version 生命周期钩子，发布请用 `scripts/release.js`。
- `reference/` 目录（API 文档、参考仓库）被 gitignore，仅本地开发使用。
- **修改 `package.json` 依赖后必须运行 `pnpm install` 更新 `pnpm-lock.yaml`**，CI 使用 `--frozen-lockfile`，锁文件不一致会直接报错。
- `manifest.json` 使用 tab 缩进，`package.json` 使用 2 空格缩进，编辑时保持原有风格。
- 发布脚本会暂存 `CHANGELOG.md` — 运行前确保已更新。
