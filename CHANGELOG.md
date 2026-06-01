# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.1] - 2026-06-01

### Changed
- 工具：移除 `builtin-modules` 依赖，使用 Node.js 原生 `module.builtinModules`
- 工具：精简 esbuild external 配置，仅保留实际使用的 `obsidian`
- 工具：发布脚本自动从 CHANGELOG.md 提取 release notes 作为 git tag 注释

## [0.4.0] - 2026-06-01

### Added
- 图片上传：发布文章时自动上传本地图片到 Halo 附件，并将 src 替换为 permalink
- 图片去重：相同文件只上传一次，所有引用都会被替换
- 发布进度：发布预览模态框下方显示 Loading 动画和进度提示

### Changed
- 重构：从 monorepo 迁移为单一包结构，简化项目组织
- CI：简化工作流，仅使用 Node.js 20 单一版本进行校验
- 工具：优化 pre-commit hook，仅格式化暂存的 `.ts` 文件
- 工具：迁移 deploy.sh 到 scripts 目录

### Fixed
- 修复 i18n 语言检测：使用 Obsidian 官方 `getLanguage()` API 替代不可靠的 `vault.config.locale` 和 `navigator.language`
- 修复附件上传 API 地址：使用正确的 `/apis/console.api.storage.halo.run/v1alpha1/attachments/-/upload`
- 修复 `app://` 协议路径解析：正确提取 vault 相对路径
- 修复附件上传结果访问：从 `result.status.permalink` 获取 permalink
- 修复附件缓存校验：使用 Extension API 替代 Console API
- 修复创建文章时通过 annotation 传递内容
- 修复 fieldSelector 格式并添加调试日志
- 修复重复发布和文章删除后发布的问题
- 修复 monorepo 遗留的过期路径

### Removed
- 移除未使用的 `.env.example` 文件

## [0.3.1] - 2026-05-29

### Fixed
- 移除 i18n 中对 localStorage 的依赖，仅保留 vault.config 和 navigator.language
- 将 `vault.getFiles()` 替换为 `vault.getMarkdownFiles()`，减少不必要的 vault 枚举
- 将图片处理中的 Node.js `Buffer.from()` 替换为浏览器原生 `btoa()`，消除 Node.js API 依赖
- 移除冗余的 checksums.txt（artifact attestation 已覆盖校验需求）

## [0.3.0] - 2026-05-29

### Added
- CI: 新增 GitHub artifact attestation，验证构建来源
- CI: 新增 SHA256 校验和文件
- CI: 升级 action-gh-release v2、pnpm/action-setup v4

### Changed
- 将 `manifest.json` 和 `versions.json` 迁移至仓库根目录（Obsidian 要求）
- 更新 release 脚本适配新的文件路径

### Fixed
- 修复 release 脚本中 versions.json 维护逻辑
- 移除未使用的根目录 manifest.json 和 copy-to-root.js

## [0.2.0] - 2026-05-28

### Added
- 国际化 (i18n) 支持：中英文双语，跟随 Obsidian 语言设置自动切换
- i18n 基础设施：类型定义、翻译文件、管理器
- 版本发布脚本：支持自动更新版本号、创建 git commit 和 tag

### Changed
- 设置页面：所有 UI 文本已国际化
- 发布预览模态框：所有 UI 文本已国际化
- 发布模态框：所有 UI 文本已国际化
- 状态栏：所有 UI 文本已国际化
- 命令面板：命令名称已国际化
- 右键菜单：菜单文本已国际化
- 通知消息：所有通知文本已国际化

### Fixed
- SiteModal 表单字段国际化

## [0.1.0] - 2026-05-28

### Added
- 核心渲染引擎：抓取 Obsidian previewMode DOM，支持所有插件语法
- Halo 文章创建：首次发布笔记到 Halo
- Halo 文章更新：更新已发布的笔记
- Halo 文章删除：从 Halo 删除文章
- FrontMatter 自动映射：title, tags, categories, slug, cover, excerpt
- 发布确认弹窗：发布前预览渲染结果
- 设置面板：Halo 站点配置（名称、地址、API Token）
- 命令面板命令：发布到 Halo、删除文章、同步所有
- 右键菜单：编辑器和文件管理器中添加发布选项
- 自动同步：配置文件夹，保存即发布
- 图片处理：支持上传到 Halo 或 Base64 内嵌
- 状态栏指示器：显示同步状态和最后同步时间
- halo-sdk：独立的 Halo REST API 封装
- 版本格式规范：Git tag 必须使用纯数字 `x.x.x` 格式，不能以 `v` 开头

### Changed
- 无

### Deprecated
- 无

### Removed
- 无

### Fixed
- 无

### Security
- 无
