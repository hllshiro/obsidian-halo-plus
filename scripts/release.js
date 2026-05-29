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

// 更新 packages/obsidian-halo-plus/manifest.json
const pluginManifestPath = path.join(projectRoot, 'packages', 'obsidian-halo-plus', 'manifest.json');
let minAppVersion = '1.5.0'; // 默认值
if (fs.existsSync(pluginManifestPath)) {
  const pluginManifest = JSON.parse(fs.readFileSync(pluginManifestPath, 'utf8'));
  minAppVersion = pluginManifest.minAppVersion || '1.5.0';
  pluginManifest.version = version;
  fs.writeFileSync(pluginManifestPath, JSON.stringify(pluginManifest, null, '\t') + '\n');
  console.log(`✓ 更新 packages/obsidian-halo-plus/manifest.json 版本号为 ${version}`);
} else {
  console.error('错误: packages/obsidian-halo-plus/manifest.json 不存在');
  process.exit(1);
}

// 更新 packages/obsidian-halo-plus/versions.json
const versionsPath = path.join(projectRoot, 'packages', 'obsidian-halo-plus', 'versions.json');
if (fs.existsSync(versionsPath)) {
  const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));
  versions[version] = minAppVersion;
  fs.writeFileSync(versionsPath, JSON.stringify(versions, null, '\t') + '\n');
  console.log(`✓ 更新 packages/obsidian-halo-plus/versions.json 添加 ${version}: ${minAppVersion}`);
} else {
  console.error('错误: packages/obsidian-halo-plus/versions.json 不存在');
  process.exit(1);
}

// 更新 packages/obsidian-halo-plus/package.json
const pluginPackagePath = path.join(projectRoot, 'packages', 'obsidian-halo-plus', 'package.json');
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
  execSync('git add packages/obsidian-halo-plus/manifest.json packages/obsidian-halo-plus/versions.json packages/obsidian-halo-plus/package.json', { cwd: projectRoot });
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
