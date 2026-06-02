# TagCategoryService 设计文档

## 问题描述

当前 halo-plus 插件在发布文章时，直接将 frontmatter 中的 `tags` 和 `categories` 字符串数组传递给 Halo API。但 Halo API 期望的是标签/分类的**内部名称**（name，通常是 UUID），而不是用户友好的**显示名称**（displayName）。

这导致用户在 frontmatter 中手动定义的 `tags` 和 `categories` 属性不会生效。

## 设计目标

1. **兼容原版插件**：保持与原版 obsidian-halo 插件相同的 frontmatter 结构
2. **自动转换**：将用户输入的显示名称自动转换为 Halo API 所需的内部名称
3. **自动创建**：如果标签/分类不存在，自动在 Halo 中创建
4. **智能缓存**：将内部名称保存到 halo 字段，避免重复转换
5. **向后兼容**：支持读取旧格式的文档

## Frontmatter 结构

### 与原版插件兼容的结构

```yaml
---
title: 文章标题
slug: article-slug
cover: https://example.com/image.jpg
excerpt: 文章摘要
tags:
  - JavaScript      # 显示名称（用户编辑）
  - TypeScript      # 显示名称（用户编辑）
categories:
  - 前端开发         # 显示名称（用户编辑）
halo:
  site: https://halo.example.com
  name: post-uuid
  publish: true
  images: []
  tagNames:          # 新增：内部名称（API 使用）
    - tag-uuid-1
    - tag-uuid-2
  categoryNames:     # 新增：内部名称（API 使用）
    - category-uuid-1
---
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 文章标题 |
| `slug` | string | 文章 slug |
| `cover` | string | 封面图 URL |
| `excerpt` | string | 文章摘要 |
| `tags` | string[] | 标签显示名称数组（用户编辑） |
| `categories` | string[] | 分类显示名称数组（用户编辑） |
| `halo.site` | string | Halo 站点 URL |
| `halo.name` | string | 文章在 Halo 中的 UUID |
| `halo.publish` | boolean | 是否已发布 |
| `halo.images` | ImageCacheEntry[] | 图片缓存 |
| `halo.tagNames` | string[] | 标签内部名称数组（API 使用） |
| `halo.categoryNames` | string[] | 分类内部名称数组（API 使用） |

## 架构设计

### 新增文件

- `src/service/tag-category-service.ts` - 标签/分类处理服务

### 修改文件

- `src/types.ts` - 扩展 HaloPost 接口
- `src/content/frontmatter-parser.ts` - 扩展 FrontMatterData 接口
- `src/main.ts` - 调用 TagCategoryService 处理标签/分类
- `src/sync/sync-manager.ts` - 调用 TagCategoryService 处理标签/分类

### 数据流

```
用户编辑 Frontmatter (显示名称)
    ↓
解析 Frontmatter
    ↓
检查 tags/categories 是否有变化
    ↓
┌─────────────────────────────────────────┐
│ 有变化                                   │
│   ↓                                      │
│ 调用 TagCategoryService.getTagNames()   │
│ 调用 TagCategoryService.getCategoryNames()│
│   ↓                                      │
│ 转换为内部名称（自动创建不存在的）          │
│   ↓                                      │
│ 保存内部名称到 halo.tagNames/categoryNames│
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 无变化                                   │
│   ↓                                      │
│ 使用 halo 中保存的内部名称                │
└─────────────────────────────────────────┘
    ↓
调用 Halo API（使用内部名称）
```

## TagCategoryService 设计

### 接口定义

```typescript
// src/service/tag-category-service.ts
import type { HaloClient } from '../halo-client';
import type { Category, Tag } from '@halo-dev/api-client';

export class TagCategoryService {
  private client: HaloClient;

  constructor(client: HaloClient) {
    this.client = client;
  }

  /**
   * 获取所有标签
   */
  async getAllTags(): Promise<Tag[]>

  /**
   * 获取所有分类
   */
  async getAllCategories(): Promise<Category[]>

  /**
   * 将显示名称转换为内部名称（不存在则自动创建）
   * @param displayNames 标签显示名称数组
   * @returns 标签内部名称数组
   */
  async getTagNames(displayNames: string[]): Promise<string[]>

  /**
   * 将显示名称转换为内部名称（不存在则自动创建）
   * @param displayNames 分类显示名称数组
   * @returns 分类内部名称数组
   */
  async getCategoryNames(displayNames: string[]): Promise<string[]>

  /**
   * 将内部名称转换为显示名称（用于 pull/update 场景）
   * @param names 标签内部名称数组
   * @returns 标签显示名称数组
   */
  async getTagDisplayNames(names: string[]): Promise<string[]>

  /**
   * 将内部名称转换为显示名称（用于 pull/update 场景）
   * @param names 分类内部名称数组
   * @returns 分类显示名称数组
   */
  async getCategoryDisplayNames(names: string[]): Promise<string[]>
}
```

### 实现细节

#### 1. 获取所有标签/分类

```typescript
async getAllTags(): Promise<Tag[]> {
  const response = await this.client.coreApi.content.tag.listTag();
  return response.data.items;
}

async getAllCategories(): Promise<Category[]> {
  const response = await this.client.coreApi.content.category.listCategory();
  return response.data.items;
}
```

#### 2. 转换显示名称为内部名称

```typescript
async getTagNames(displayNames: string[]): Promise<string[]> {
  const allTags = await this.getAllTags();

  // 找出不存在的标签
  const notExistDisplayNames = displayNames.filter(
    (name) => !allTags.find((item) => item.spec.displayName === name)
  );

  // 自动创建不存在的标签
  const newTags = await Promise.all(
    notExistDisplayNames.map((name) =>
      this.client.httpClient.post('/apis/content.halo.run/v1alpha1/tags', {
        spec: {
          displayName: name,
          slug: generateSlug(name),
          color: '#ffffff',
          cover: '',
        },
        apiVersion: 'content.halo.run/v1alpha1',
        kind: 'Tag',
        metadata: { name: '', generateName: 'tag-' },
      })
    )
  );

  // 获取已存在标签的内部名称
  const existNames = displayNames
    .map((name) => {
      const found = allTags.find((item) => item.spec.displayName === name);
      return found ? found.metadata.name : undefined;
    })
    .filter(Boolean) as string[];

  // 合并结果
  return [...existNames, ...newTags.map((item) => item.data.metadata.name)];
}
```

#### 3. 转换内部名称为显示名称

```typescript
async getTagDisplayNames(names: string[]): Promise<string[]> {
  const allTags = await this.getAllTags();
  return names
    .map((name) => {
      const found = allTags.find((item) => item.metadata.name === name);
      return found ? found.spec.displayName : undefined;
    })
    .filter(Boolean) as string[];
}
```

## 发布流程修改

### main.ts 修改

```typescript
// 在 doPublish 函数中
import { TagCategoryService } from './service/tag-category-service';

// 创建 TagCategoryService 实例
const tagCategoryService = new TagCategoryService(client);

// 获取标签/分类内部名称
let tagNames: string[] = [];
let categoryNames: string[] = [];

if (currentFrontmatter.tags && currentFrontmatter.tags.length > 0) {
  // 检查是否有变化
  const oldTagNames = currentFrontmatter.halo?.tagNames || [];
  const oldTagDisplayNames = await tagCategoryService.getTagDisplayNames(oldTagNames);
  const hasChanged = JSON.stringify(currentFrontmatter.tags.sort()) !==
                     JSON.stringify(oldTagDisplayNames.sort());

  if (hasChanged) {
    tagNames = await tagCategoryService.getTagNames(currentFrontmatter.tags as string[]);
  } else {
    tagNames = oldTagNames;
  }
}

if (currentFrontmatter.categories && currentFrontmatter.categories.length > 0) {
  const oldCategoryNames = currentFrontmatter.halo?.categoryNames || [];
  const oldCategoryDisplayNames = await tagCategoryService.getCategoryDisplayNames(oldCategoryNames);
  const hasChanged = JSON.stringify(currentFrontmatter.categories.sort()) !==
                     JSON.stringify(oldCategoryDisplayNames.sort());

  if (hasChanged) {
    categoryNames = await tagCategoryService.getCategoryNames(currentFrontmatter.categories as string[]);
  } else {
    categoryNames = oldCategoryNames;
  }
}

// 构建 Post 对象时使用内部名称
const newPost: ApiPost = {
  // ...
  spec: {
    // ...
    tags: tagNames,
    categories: categoryNames,
  },
};

// 保存到 frontmatter
await this.updateFrontMatter(file, {
  // ...
  halo: {
    // ...
    tagNames: tagNames,
    categoryNames: categoryNames,
  },
});
```

### sync-manager.ts 修改

与 main.ts 类似，调用 TagCategoryService 处理标签/分类。

## 错误处理

1. **网络错误**：捕获并提示用户检查网络连接
2. **标签/分类创建失败**：记录日志，继续处理其他标签/分类
3. **API 权限错误**：提示用户检查 Token 权限
4. **空值处理**：如果 tags/categories 为空数组，直接使用空数组

## 向后兼容

1. **读取旧文档**：如果没有 `tagNames`/`categoryNames`，自动从显示名称转换
2. **保存新格式**：始终保存 `tagNames`/`categoryNames` 到 halo 字段
3. **一级属性不变**：`tags`/`categories` 始终保存显示名称，与原版插件兼容

## 测试策略

1. **单元测试**：测试 TagCategoryService 的各个方法
2. **集成测试**：测试完整的发布流程
3. **边界测试**：测试空数组、重复标签、特殊字符等场景

## 实现计划

1. 创建 `src/service/tag-category-service.ts`
2. 扩展 `src/content/frontmatter-parser.ts` 中的 FrontMatterData 接口
3. 修改 `src/main.ts` 中的发布逻辑
4. 修改 `src/sync/sync-manager.ts` 中的同步逻辑
5. 测试各种场景
6. 更新文档
