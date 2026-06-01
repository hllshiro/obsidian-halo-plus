#!/bin/bash
# Deploy script for Obsidian plugin
# Usage:
#   1. Set DEPLOY_TARGET_DIR in .env file, then run: pnpm deploy:local
#   2. Or export environment variable: DEPLOY_TARGET_DIR=/path/to/obsidian/plugins/obsidian-halo-plus pnpm deploy:local

set -e

# Load .env file if it exists
if [ -f .env ]; then
  echo "正在加载 .env 文件..."
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DEPLOY_TARGET_DIR" ]; then
  echo "错误：未设置 DEPLOY_TARGET_DIR 环境变量。"
  echo "请通过以下方式之一设置："
  echo "  1. 在 .env 文件中添加：DEPLOY_TARGET_DIR=/path/to/obsidian/plugins/obsidian-halo-plus"
  echo "  2. 或导出环境变量：export DEPLOY_TARGET_DIR=/path/to/obsidian/plugins/obsidian-halo-plus"
  exit 1
fi

echo "正在构建..."
pnpm build

echo "正在复制文件..."
cp packages/obsidian-halo-plus/dist/main.js "$DEPLOY_TARGET_DIR/"
cp packages/obsidian-halo-plus/dist/styles.css "$DEPLOY_TARGET_DIR/"
cp manifest.json "$DEPLOY_TARGET_DIR/"

echo "完成！文件已部署到：$DEPLOY_TARGET_DIR"