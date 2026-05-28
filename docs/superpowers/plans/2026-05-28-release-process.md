# 版本发布流程实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. It will decide whether each batch should run in parallel or serial subagent mode and will pass only task-local context to each subagent. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建版本发布流程脚本，支持自动更新版本号、创建 git commit 和 tag、推送到远程仓库。

**Architecture:** 创建一个 Node.js 脚本 `scripts/release.js`，接收版本号参数，验证格式后更新 manifest.json 和 package.json 中的版本号，然后创建 git commit 和 tag 并推送到远程。

**Tech Stack:** Node.js, Git

---

## 文件结构

### 新建文件
- `scripts/release.js` - 发布脚本

### 修改文件
- `package.json` - 添加 release 脚本命令

### 自动更新文件
- `manifest.json` - 版本号自动更新
- `packages/obsidian-halo-plus/package.json` - 版本号自动更新

---

## 任务 1: 创建发布脚本

**文件:**
- Create: `scripts/release.js`

- [ ] **步骤 1: 创建发布脚本文件**

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取命令行参数
const version = process.argv[2];

// 验证版本号格式
if (!version) {
  console.error('错误: 请提供版本号');
  console.error('用法: node scripts/release.js <version>');
  console.error('示例: node scripts/release.js 0.2.0');
  process.exit(1);
}

// 验证版本号格式（必须是 x.x.x 格式，不能以 v 开头）
const versionRegex = /^\d+\.\d+\.\d+$/;
if (!versionRegex.test(version)) {
  console.error(`错误: 版本号格式无效: ${version}`);
  console.error('版本号必须是 x.x.x 格式，不能以 v 开头');
  console.error('示例: 0.2.0, 1.0.0, 1.2.3');
  process.exit(1);
}

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '..');

// 更新 manifest.json
const manifestPath = path.join(projectRoot, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = version;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`✓ 更新 manifest.json 版本号为 ${version}`);
} else {
  console.error('错误: manifest.json 不存在');
  process.exit(1);
}

// 更新 packages/obsidian-halo-plus/package.json
const pluginPackagePath = path.join(projectRoot, 'packages/obsidian-halo-plus/package.json');
if (fs.existsSync(pluginPackagePath)) {
  const pluginPackage = JSON.parse(fs.readFileSync(pluginPackagePath, 'utf8'));
  pluginPackage.version = version;
  fs.writeFileSync(pluginPackagePath, JSON.stringify(pluginPackage, null, 2) + '\n');
  console.log(`✓ 更新 packages/obsidian-halo-plus/package.json 版本号为 ${version}`);
} else {
  console.error('错误: packages/obsidian-halo-plus/package.json 不存在');
  process.exit(1);
}

// 创建 git commit
try {
  execSync('git add manifest.json packages/obsidian-halo-plus/package.json', { cwd: projectRoot });
  execSync(`git commit -m "chore(release): ${version}"`, { cwd: projectRoot });
  console.log(`✓ 创建 git commit: chore(release): ${version}`);
} catch (error) {
  console.error('错误: 创建 git commit 失败');
  console.error(error.message);
  process.exit(1);
}

// 创建 git tag
try {
  execSync(`git tag ${version}`, { cwd: projectRoot });
  console.log(`✓ 创建 git tag: ${version}`);
} catch (error) {
  console.error('错误: 创建 git tag 失败');
  console.error(error.message);
  process.exit(1);
}

// 推送到远程仓库
try {
  execSync('git push', { cwd: projectRoot });
  execSync('git push --tags', { cwd: projectRoot });
  console.log('✓ 推送到远程仓库');
} catch (error) {
  console.error('错误: 推送到远程仓库失败');
  console.error(error.message);
  process.exit(1);
}

console.log(`\n✓ 版本 ${version} 发布成功！`);
```

- [ ] **步骤 2: 为脚本添加可执行权限**

运行: `chmod +x scripts/release.js`

- [ ] **步骤 3: 验证脚本创建**

运行: `ls -la scripts/release.js`
Expected: 看到 release.js 文件，且有可执行权限

- [ ] **步骤 4: 提交代码**

```bash
git add scripts/release.js
git commit -m "feat: add release script for version management"
```

---

## 任务 2: 添加 package.json 脚本命令

**文件:**
- Modify: `package.json`

- [ ] **步骤 1: 添加 release 脚本命令**

在 package.json 的 scripts 对象中添加：

```json
{
  "scripts": {
    "release": "node scripts/release.js"
  }
}
```

- [ ] **步骤 2: 验证修改**

运行: `cat package.json | grep -A 5 "scripts"`
Expected: 看到 "release": "node scripts/release.js"

- [ ] **步骤 3: 提交代码**

```bash
git add package.json
git commit -m "feat: add release script to package.json"
```

---

## 任务 3: 验证发布脚本

- [ ] **步骤 1: 测试版本号验证**

运行: `node scripts/release.js v1.0.0`
Expected: 脚本报错，提示版本号格式无效

- [ ] **步骤 2: 测试版本号验证（无效格式）**

运行: `node scripts/release.js 1.0`
Expected: 脚本报错，提示版本号格式无效

- [ ] **步骤 3: 测试无参数情况**

运行: `node scripts/release.js`
Expected: 脚本报错，提示请提供版本号

- [ ] **步骤 4: 验证脚本帮助信息**

运行: `node scripts/release.js --help` 或不带参数运行
Expected: 显示用法说明

---

## 自我审查清单

- [x] 所有任务都有具体的文件路径和代码
- [x] 所有步骤都是可执行的（2-5分钟）
- [x] 包含验证步骤
- [x] 包含提交步骤
- [x] 无占位符或模糊描述
- [x] 覆盖设计文档中的所有要求
- [x] 版本号验证逻辑完整
- [x] 错误处理完整
