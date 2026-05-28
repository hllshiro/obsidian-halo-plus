# 版本发布流程设计文档

## 概述

设计新版本发布流程，包括版本号更新、CHANGELOG 更新和 git tag 创建。

## 需求

1. 版本号策略：使用 semantic versioning（0.2.0 格式）
2. CHANGELOG 更新：手动编辑 CHANGELOG.md
3. Tag 创建：使用 pnpm version 命令自动创建
4. 发布流程：完整自动化脚本

## 当前状态

- 当前版本：0.1.0
- 已有 tag：0.1.0
- CHANGELOG.md：已存在，使用 Keep a Changelog 格式

## 架构设计

### 发布流程

```
1. 手动更新 CHANGELOG.md
   ↓
2. 运行 pnpm release <version>
   ↓
3. 脚本自动执行：
   - 更新 manifest.json 版本号
   - 更新 packages/obsidian-halo-plus/package.json 版本号
   - 创建 git commit: "chore(release): <version>"
   - 创建 git tag: "<version>"
   - 推送到远程仓库
```

### 文件结构

```
scripts/
└── release.js          # 发布脚本
package.json            # 添加 release 脚本命令
manifest.json           # 版本号自动更新
packages/obsidian-halo-plus/package.json  # 版本号自动更新
CHANGELOG.md            # 手动更新
```

## 核心组件

### 1. 发布脚本 (scripts/release.js)

脚本功能：
- 验证版本号格式（必须是 x.x.x 格式，不能以 v 开头）
- 更新 manifest.json 中的 version 字段
- 更新 packages/obsidian-halo-plus/package.json 中的 version 字段
- 创建 git commit
- 创建 git tag
- 推送到远程仓库

### 2. package.json 脚本命令

在根目录 package.json 中添加：
```json
{
  "scripts": {
    "release": "node scripts/release.js"
  }
}
```

## 使用方式

### 发布新版本

```bash
# 1. 更新 CHANGELOG.md
# 手动编辑 CHANGELOG.md，添加新版本的变更内容

# 2. 运行发布脚本
pnpm release 0.2.0
```

### 版本号格式要求

- 必须是 semantic versioning 格式：`x.x.x`
- 不能以 `v` 开头（Obsidian 要求）
- 示例：`0.2.0`、`1.0.0`、`1.2.3`

## 文件修改清单

### 新建文件

- `scripts/release.js` - 发布脚本

### 修改文件

- `package.json` - 添加 release 脚本命令

### 自动更新文件

- `manifest.json` - 版本号自动更新
- `packages/obsidian-halo-plus/package.json` - 版本号自动更新

## 验收标准

1. 发布脚本能正确验证版本号格式
2. 发布脚本能正确更新 manifest.json 版本号
3. 发布脚本能正确更新 package.json 版本号
4. 发布脚本能正确创建 git commit
5. 发布脚本能正确创建 git tag
6. 发布脚本能正确推送到远程仓库
7. 版本号格式符合 Obsidian 要求（不以 v 开头）

## 注意事项

1. 版本号必须是纯数字格式，不能包含 v 前缀
2. CHANGELOG.md 需要手动更新
3. 发布前确保所有更改已提交
4. 发布脚本会自动推送，确保有远程仓库的推送权限
