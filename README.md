# Halo Plus

> 将 Obsidian 笔记发布到 Halo 博客，支持所有 Obsidian 插件渲染内容（Dataview、Tasks、Callout 等）

[![GitHub release](https://img.shields.io/github/v/release/yourusername/obsidian-halo-plus)](https://github.com/yourusername/obsidian-halo-plus/releases)
[![GitHub](https://img.shields.io/github/license/yourusername/obsidian-halo-plus)](LICENSE)

## ✨ 特性

- 🎨 **原生渲染**：抓取 Obsidian 完整渲染后的 HTML，支持所有已安装插件
- 📤 **一键发布**：命令面板或右键菜单，快速发布到 Halo
- 🔄 **自动同步**：配置文件夹，保存即发布
- 🖼️ **图片处理**：支持上传到 Halo 或 Base64 内嵌
- 🔒 **离线可用**：纯本地运行，无外网依赖
- 🗑️ **文章管理**：支持发布、更新、删除

## 📦 安装

### 从 Obsidian 社区插件安装（推荐）

1. 打开 Obsidian 设置 → 第三方插件 → 浏览
2. 搜索 "Halo Plus"
3. 点击安装，然后启用

### 手动安装（离线）

1. 从 [GitHub Releases](https://github.com/yourusername/obsidian-halo-plus/releases) 下载最新版本
2. 解压到 `{vault}/.obsidian/plugins/halo-plus/`
3. 在 Obsidian 设置 → 第三方插件中启用 "Halo Plus"

## 🚀 快速开始

### 1. 配置 Halo 站点

1. 打开 Obsidian 设置 → Halo Plus
2. 点击 "添加站点"
3. 填写：
   - **站点名称**：My Blog
   - **站点地址**：https://halo.example.com
   - **API Token**：在 Halo 后台 → 个人中心 → 个人令牌 创建
4. 点击 "验证连接" 测试

### 2. 发布笔记

1. 编辑笔记，在 FrontMatter 中设置元数据：

```yaml
---
title: "我的文章标题"
tags:
  - "技术"
  - "Obsidian"
categories:
  - "博客"
---
```

2. 通过以下方式发布：
   - 命令面板：`Ctrl/Cmd + P` → 输入 "Halo Plus: 发布到 Halo"
   - 右键菜单：在编辑器中右键 → "发布到 Halo"

### 3. 自动同步

1. 在设置中启用 "文件夹同步"
2. 添加需要同步的文件夹路径
3. 编辑并保存笔记后自动发布

## ⚙️ 配置项

### 站点配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| 站点名称 | 显示名称 | - |
| 站点地址 | Halo 服务器 URL | - |
| API Token | 个人访问令牌 | - |
| 默认站点 | 是否为默认发布站点 | false |

### 发布行为

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| 默认发布后自动发布 | 创建文章后自动发布 | true |
| 跳过预览直接发布 | 不弹出确认窗口 | false |
| 发布后清理临时文件 | 渲染后清理临时副本 | true |

### 图片处理

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| 默认模式 | 上传到 Halo / Base64 内嵌 | upload |
| Base64 压缩质量 | 0-100 | 80 |

## 📝 FrontMatter 属性

| 属性 | 类型 | 说明 | 必需 |
|------|------|------|------|
| `title` | string | 文章标题 | 否（默认使用文件名） |
| `slug` | string | URL slug | 否（自动生成） |
| `tags` | string[] | 标签列表 | 否 |
| `categories` | string[] | 分类列表 | 否 |
| `cover` | string | 封面图片 URL | 否 |
| `excerpt` | string | 文章摘要 | 否 |
| `date` | string | 发布时间 | 否（默认使用创建时间） |

### Halo 跟踪字段（自动管理）

| 属性 | 说明 |
|------|------|
| `halo.site` | 关联的 Halo 站点 URL |
| `halo.name` | Halo 文章 ID |
| `halo.publish` | 是否已发布 |

## 🔧 开发

### 环境要求

- Node.js 16+
- pnpm 8+

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/yourusername/obsidian-halo-plus.git
cd obsidian-halo-plus

# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 开发模式（监听文件变化）
pnpm dev
```

### 项目结构

```
obsidian-halo-plus/
├── packages/
│   ├── halo-sdk/              # Halo REST API SDK
│   ├── obsidian-halo-plus/    # Obsidian 插件
│   └── halo-cli/              # CLI 工具
├── pnpm-workspace.yaml
└── package.json
```

## 📄 许可证

[MIT](LICENSE)

## 🙏 致谢

- [obsidian-halo](https://github.com/halo-sigs/obsidian-halo) - 原版插件参考
- [Obsidian](https://obsidian.md) - 优秀的笔记应用
- [Halo](https://halo.run) - 强大的博客平台
