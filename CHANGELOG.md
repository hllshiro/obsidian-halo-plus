# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
