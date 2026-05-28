# 验收标准: 版本发布流程

**Spec:** `docs/superpowers/specs/2026-05-28-release-process-design.md`
**Date:** 2026-05-28
**Status:** Draft

---

## 标准

| ID | 描述 | 测试类型 | 前置条件 | 预期结果 |
|----|------|----------|----------|----------|
| AC-001 | 发布脚本能正确验证版本号格式 | Logic | scripts/release.js 存在 | 运行 `node scripts/release.js v1.0.0` 时脚本报错并退出，提示版本号不能以 v 开头 |
| AC-002 | 发布脚本能正确更新 manifest.json 版本号 | Logic | scripts/release.js 存在，manifest.json 版本为 0.1.0 | 运行 `node scripts/release.js 0.2.0` 后，manifest.json 中 version 字段变为 "0.2.0" |
| AC-003 | 发布脚本能正确更新 package.json 版本号 | Logic | scripts/release.js 存在，packages/obsidian-halo-plus/package.json 版本为 0.1.0 | 运行 `node scripts/release.js 0.2.0` 后，packages/obsidian-halo-plus/package.json 中 version 字段变为 "0.2.0" |
| AC-004 | 发布脚本能正确创建 git commit | Logic | scripts/release.js 存在，有未提交的更改 | 运行 `node scripts/release.js 0.2.0` 后，git log 中出现 "chore(release): 0.2.0" 提交 |
| AC-005 | 发布脚本能正确创建 git tag | Logic | scripts/release.js 存在 | 运行 `node scripts/release.js 0.2.0` 后，git tag 列表中出现 "0.2.0" |
| AC-006 | 发布脚本能正确推送到远程仓库 | Logic | scripts/release.js 存在，有远程仓库配置 | 运行 `node scripts/release.js 0.2.0` 后，远程仓库包含该提交和 tag |
| AC-007 | 版本号格式符合 Obsidian 要求 | Logic | scripts/release.js 存在 | 运行 `node scripts/release.js 1.0.0` 成功，运行 `node scripts/release.js v1.0.0` 失败 |
| AC-008 | package.json 中添加 release 脚本命令 | Logic | package.json 存在 | package.json 中 scripts 对象包含 "release": "node scripts/release.js" |
| AC-009 | 发布脚本处理不存在的文件 | Logic | scripts/release.js 存在，manifest.json 不存在 | 运行 `node scripts/release.js 0.2.0` 时脚本报错并提示文件不存在 |
| AC-010 | 发布脚本处理版本号格式错误 | Logic | scripts/release.js 存在 | 运行 `node scripts/release.js 1.0` 时脚本报错并提示版本号格式错误 |

---

## 覆盖检查

- [x] 版本号验证 (AC-001, AC-007, AC-010)
- [x] manifest.json 更新 (AC-002)
- [x] package.json 更新 (AC-003)
- [x] git commit 创建 (AC-004)
- [x] git tag 创建 (AC-005)
- [x] 远程推送 (AC-006)
- [x] 脚本命令配置 (AC-008)
- [x] 错误处理 (AC-009, AC-010)

## 自我审查

- [x] 所有预期结果都是确定性的，可以通过具体命令或观察检查
- [x] 测试类型正确（Logic 用于纯函数和脚本行为）
- [x] ID 顺序连续，无间隔
- [x] 无占位符或模糊描述
