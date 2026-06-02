# 提交规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

## 格式

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## 类型 (type)

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

## 范围 (scope)

可选，表示影响范围：

- **publish**: 发布功能
- **settings**: 设置功能
- **sync**: 同步功能
- **renderer**: 渲染器
- **i18n**: 国际化
- **deploy**: 部署脚本
- **release**: 发布流程

## 描述 (description)

- 使用中文描述
- 简洁明示，说明做了什么
- 不超过 50 个字符

## 示例

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

## 工具

- **commitlint**: 可选，用于强制提交规范
- **husky**: pre-commit hook，运行 biome 检查

## 注意事项

1. 提交信息使用英文（type 和 description）
2. scope 使用英文小写
3. 每次提交只做一件事
4. 提交前确保代码通过 lint 检查
5. **修改 `package.json` 依赖后必须运行 `pnpm install` 更新 `pnpm-lock.yaml`**，否则 CI 会因 `--frozen-lockfile` 报错