# TagCategoryService Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. It will decide whether each batch should run in parallel or serial subagent mode and will pass only task-local context to each subagent. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 TagCategoryService，支持在发布时自动将 frontmatter 中的 tags/categories 显示名称转换为 Halo API 所需的内部名称，并自动创建不存在的标签/分类。

**Architecture:** 创建独立的 TagCategoryService 服务类，封装标签/分类的获取、转换和创建逻辑。修改 main.ts 和 sync-manager.ts 调用此服务处理标签/分类。

**Tech Stack:** TypeScript, @halo-dev/api-client, Obsidian API

---

## File Structure

### 新增文件
- `src/service/tag-category-service.ts` - 标签/分类处理服务

### 修改文件
- `src/content/frontmatter-parser.ts` - 扩展 FrontMatterData 接口
- `src/main.ts` - 调用 TagCategoryService 处理标签/分类
- `src/sync/sync-manager.ts` - 调用 TagCategoryService 处理标签/分类

---

## Task 1: 创建 TagCategoryService 基础结构

**Files:**
- Create: `src/service/tag-category-service.ts`

- [ ] **Step 1: 创建 service 目录**

```bash
mkdir -p src/service
```

- [ ] **Step 2: 创建 TagCategoryService 文件**

```typescript
// src/service/tag-category-service.ts
import type { Category, Tag } from '@halo-dev/api-client';
import type { HaloClient } from '../halo-client';
import { generateSlug } from '../content/frontmatter-parser';

export class TagCategoryService {
  private client: HaloClient;

  constructor(client: HaloClient) {
    this.client = client;
  }

  /**
   * 获取所有标签
   */
  async getAllTags(): Promise<Tag[]> {
    const response = await this.client.coreApi.content.tag.listTag();
    return response.data.items;
  }

  /**
   * 获取所有分类
   */
  async getAllCategories(): Promise<Category[]> {
    const response = await this.client.coreApi.content.category.listCategory();
    return response.data.items;
  }

  /**
   * 将显示名称转换为内部名称（不存在则自动创建）
   */
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

  /**
   * 将显示名称转换为内部名称（不存在则自动创建）
   */
  async getCategoryNames(displayNames: string[]): Promise<string[]> {
    const allCategories = await this.getAllCategories();

    // 找出不存在的分类
    const notExistDisplayNames = displayNames.filter(
      (name) => !allCategories.find((item) => item.spec.displayName === name)
    );

    // 自动创建不存在的分类
    const newCategories = await Promise.all(
      notExistDisplayNames.map((name) =>
        this.client.httpClient.post('/apis/content.halo.run/v1alpha1/categories', {
          spec: {
            displayName: name,
            slug: generateSlug(name),
            description: '',
            cover: '',
            template: '',
            priority: 0,
            children: [],
          },
          apiVersion: 'content.halo.run/v1alpha1',
          kind: 'Category',
          metadata: { name: '', generateName: 'category-' },
        })
      )
    );

    // 获取已存在分类的内部名称
    const existNames = displayNames
      .map((name) => {
        const found = allCategories.find((item) => item.spec.displayName === name);
        return found ? found.metadata.name : undefined;
      })
      .filter(Boolean) as string[];

    // 合并结果
    return [...existNames, ...newCategories.map((item) => item.data.metadata.name)];
  }

  /**
   * 将内部名称转换为显示名称
   */
  async getTagDisplayNames(names: string[]): Promise<string[]> {
    const allTags = await this.getAllTags();
    return names
      .map((name) => {
        const found = allTags.find((item) => item.metadata.name === name);
        return found ? found.spec.displayName : undefined;
      })
      .filter(Boolean) as string[];
  }

  /**
   * 将内部名称转换为显示名称
   */
  async getCategoryDisplayNames(names: string[]): Promise<string[]> {
    const allCategories = await this.getAllCategories();
    return names
      .map((name) => {
        const found = allCategories.find((item) => item.metadata.name === name);
        return found ? found.spec.displayName : undefined;
      })
      .filter(Boolean) as string[];
  }
}
```

- [ ] **Step 3: 验证文件创建**

```bash
ls -la src/service/tag-category-service.ts
```

Expected: 文件存在

- [ ] **Step 4: Commit**

```bash
git add src/service/tag-category-service.ts
git commit -m "feat: create TagCategoryService base structure"
```

---

## Task 2: 扩展 FrontMatterData 接口

**Files:**
- Modify: `src/content/frontmatter-parser.ts`

- [ ] **Step 1: 修改 FrontMatterData 接口**

在 `src/content/frontmatter-parser.ts` 中，修改 `halo` 属性的类型定义：

```typescript
// src/content/frontmatter-parser.ts

export interface FrontMatterData {
  title?: string;
  slug?: string;
  tags?: string[];
  categories?: string[];
  cover?: string;
  excerpt?: string;
  date?: string;
  halo?: {
    site: string;
    name: string;
    publish: boolean;
    images?: ImageCacheEntry[];
    tagNames?: string[];      // 新增
    categoryNames?: string[]; // 新增
  };
  [key: string]: unknown;
}
```

- [ ] **Step 2: 验证修改**

```bash
grep -n "tagNames\|categoryNames" src/content/frontmatter-parser.ts
```

Expected: 显示新增的字段定义

- [ ] **Step 3: Commit**

```bash
git add src/content/frontmatter-parser.ts
git commit -m "feat: extend FrontMatterData interface with tagNames and categoryNames"
```

---

## Task 3: 修改 main.ts 发布逻辑

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: 添加 import 语句**

在 `src/main.ts` 顶部添加：

```typescript
import { TagCategoryService } from './service/tag-category-service';
```

- [ ] **Step 2: 修改 doPublish 函数中的标签/分类处理逻辑**

在 `doPublish` 函数中，找到创建新文章和更新已有文章的部分，修改为使用 TagCategoryService：

**创建新文章部分（约第 370-414 行）：**

```typescript
// 在创建新文章之前，处理标签和分类
const tagCategoryService = new TagCategoryService(client);

let tagNames: string[] = [];
let categoryNames: string[] = [];

if (currentFrontmatter.tags && currentFrontmatter.tags.length > 0) {
  tagNames = await tagCategoryService.getTagNames(currentFrontmatter.tags as string[]);
}

if (currentFrontmatter.categories && currentFrontmatter.categories.length > 0) {
  categoryNames = await tagCategoryService.getCategoryNames(currentFrontmatter.categories as string[]);
}

const newPost: ApiPost = {
  apiVersion: 'content.halo.run/v1alpha1',
  kind: 'Post',
  metadata: {
    name: postName,
    annotations: {
      'content.halo.run/content-json': JSON.stringify(contentData),
    },
  },
  spec: {
    title: effectiveTitle,
    slug: effectiveSlug,
    cover: (currentFrontmatter.cover as string) || '',
    deleted: false,
    publish: this.settings.publishBehavior.publishByDefault,
    pinned: false,
    allowComment: true,
    visible: 'PUBLIC' as ApiPostSpec['visible'],
    priority: 0,
    excerpt: {
      autoGenerate: true,
      raw: (currentFrontmatter.excerpt as string) || '',
    },
    categories: categoryNames,
    tags: tagNames,
    htmlMetas: [],
  },
};
```

**更新已有文章部分（约第 315-342 行）：**

```typescript
// 在更新已有文章之前，处理标签和分类
const tagCategoryService = new TagCategoryService(client);

let tagNames: string[] = [];
let categoryNames: string[] = [];

if (currentFrontmatter.tags && currentFrontmatter.tags.length > 0) {
  // 检查是否有变化
  const oldTagNames = currentFrontmatter.halo?.tagNames || [];
  if (oldTagNames.length > 0) {
    const oldTagDisplayNames = await tagCategoryService.getTagDisplayNames(oldTagNames);
    const hasChanged = JSON.stringify([...currentFrontmatter.tags].sort()) !==
                       JSON.stringify([...oldTagDisplayNames].sort());

    if (hasChanged) {
      tagNames = await tagCategoryService.getTagNames(currentFrontmatter.tags as string[]);
    } else {
      tagNames = oldTagNames;
    }
  } else {
    tagNames = await tagCategoryService.getTagNames(currentFrontmatter.tags as string[]);
  }
}

if (currentFrontmatter.categories && currentFrontmatter.categories.length > 0) {
  // 检查是否有变化
  const oldCategoryNames = currentFrontmatter.halo?.categoryNames || [];
  if (oldCategoryNames.length > 0) {
    const oldCategoryDisplayNames = await tagCategoryService.getCategoryDisplayNames(oldCategoryNames);
    const hasChanged = JSON.stringify([...currentFrontmatter.categories].sort()) !==
                       JSON.stringify([...oldCategoryDisplayNames].sort());

    if (hasChanged) {
      categoryNames = await tagCategoryService.getCategoryNames(currentFrontmatter.categories as string[]);
    } else {
      categoryNames = oldCategoryNames;
    }
  } else {
    categoryNames = await tagCategoryService.getCategoryNames(currentFrontmatter.categories as string[]);
  }
}

const postToUpdate = {
  ...existing,
  spec: {
    ...existing.spec,
    title: effectiveTitle,
    slug: effectiveSlug,
    cover: (currentFrontmatter.cover as string) ?? existing.spec.cover,
    excerpt: currentFrontmatter.excerpt
      ? { autoGenerate: true, raw: currentFrontmatter.excerpt as string }
      : existing.spec.excerpt,
    categories: categoryNames,
    tags: tagNames,
  },
};
```

- [ ] **Step 3: 修改 updateFrontMatter 调用，保存内部名称**

在 `doPublish` 函数末尾，修改 `updateFrontMatter` 调用：

```typescript
if (post) {
  await this.updateFrontMatter(file, {
    title: effectiveTitle,
    slug: effectiveSlug,
    halo: {
      site: site.url,
      name: post.metadata.name,
      publish: this.settings.publishBehavior.publishByDefault,
      images: updatedImageCache,
      tagNames: tagNames,
      categoryNames: categoryNames,
    },
  });
}
```

- [ ] **Step 4: 验证修改**

```bash
pnpm build
```

Expected: 构建成功

- [ ] **Step 5: Commit**

```bash
git add src/main.ts
git commit -m "feat: integrate TagCategoryService in main publish flow"
```

---

## Task 4: 修改 sync-manager.ts 同步逻辑

**Files:**
- Modify: `src/sync/sync-manager.ts`

- [ ] **Step 1: 添加 import 语句**

在 `src/sync/sync-manager.ts` 顶部添加：

```typescript
import { TagCategoryService } from '../service/tag-category-service';
```

- [ ] **Step 2: 修改 syncFile 函数中的标签/分类处理逻辑**

在 `syncFile` 函数中，找到创建新文章和更新已有文章的部分，修改为使用 TagCategoryService：

**创建新文章部分（约第 166-208 行）：**

```typescript
// 在创建新文章之前，处理标签和分类
const tagCategoryService = new TagCategoryService(client);

let tagNames: string[] = [];
let categoryNames: string[] = [];

if (frontmatter.tags && frontmatter.tags.length > 0) {
  tagNames = await tagCategoryService.getTagNames(frontmatter.tags as string[]);
}

if (frontmatter.categories && frontmatter.categories.length > 0) {
  categoryNames = await tagCategoryService.getCategoryNames(frontmatter.categories as string[]);
}

const newPost: ApiPost = {
  apiVersion: 'content.halo.run/v1alpha1',
  kind: 'Post',
  metadata: {
    name: postName,
    annotations: {
      'content.halo.run/content-json': JSON.stringify(contentData),
    },
  },
  spec: {
    title: effectiveTitle,
    slug: effectiveSlug,
    cover: frontmatter.cover || '',
    deleted: false,
    publish: this.plugin.settings.publishBehavior.publishByDefault,
    pinned: false,
    allowComment: true,
    visible: 'PUBLIC' as ApiPostSpec['visible'],
    priority: 0,
    excerpt: {
      autoGenerate: true,
      raw: frontmatter.excerpt || '',
    },
    categories: categoryNames,
    tags: tagNames,
    htmlMetas: [],
  },
};
```

**更新已有文章部分（约第 113-140 行）：**

```typescript
// 在更新已有文章之前，处理标签和分类
const tagCategoryService = new TagCategoryService(client);

let tagNames: string[] = [];
let categoryNames: string[] = [];

if (frontmatter.tags && frontmatter.tags.length > 0) {
  // 检查是否有变化
  const oldTagNames = frontmatter.halo?.tagNames || [];
  if (oldTagNames.length > 0) {
    const oldTagDisplayNames = await tagCategoryService.getTagDisplayNames(oldTagNames);
    const hasChanged = JSON.stringify([...frontmatter.tags].sort()) !==
                       JSON.stringify([...oldTagDisplayNames].sort());

    if (hasChanged) {
      tagNames = await tagCategoryService.getTagNames(frontmatter.tags as string[]);
    } else {
      tagNames = oldTagNames;
    }
  } else {
    tagNames = await tagCategoryService.getTagNames(frontmatter.tags as string[]);
  }
}

if (frontmatter.categories && frontmatter.categories.length > 0) {
  // 检查是否有变化
  const oldCategoryNames = frontmatter.halo?.categoryNames || [];
  if (oldCategoryNames.length > 0) {
    const oldCategoryDisplayNames = await tagCategoryService.getCategoryDisplayNames(oldCategoryNames);
    const hasChanged = JSON.stringify([...frontmatter.categories].sort()) !==
                       JSON.stringify([...oldCategoryDisplayNames].sort());

    if (hasChanged) {
      categoryNames = await tagCategoryService.getCategoryNames(frontmatter.categories as string[]);
    } else {
      categoryNames = oldCategoryNames;
    }
  } else {
    categoryNames = await tagCategoryService.getCategoryNames(frontmatter.categories as string[]);
  }
}

const postToUpdate = {
  ...existing,
  spec: {
    ...existing.spec,
    title: effectiveTitle,
    slug: effectiveSlug,
    cover: frontmatter.cover ?? existing.spec.cover,
    excerpt: frontmatter.excerpt
      ? { autoGenerate: true, raw: frontmatter.excerpt }
      : existing.spec.excerpt,
    categories: categoryNames,
    tags: tagNames,
  },
};
```

- [ ] **Step 3: 修改 updateFrontMatter 调用，保存内部名称**

在 `syncFile` 函数末尾，修改 `updateFrontMatter` 调用：

```typescript
if (post) {
  await this.updateFrontMatter(file, {
    title: effectiveTitle,
    slug: effectiveSlug,
    halo: {
      site: site.url,
      name: post.metadata.name,
      publish: this.plugin.settings.publishBehavior.publishByDefault,
      images: updatedImageCache,
      tagNames: tagNames,
      categoryNames: categoryNames,
    },
  });
}
```

- [ ] **Step 4: 验证修改**

```bash
pnpm build
```

Expected: 构建成功

- [ ] **Step 5: Commit**

```bash
git add src/sync/sync-manager.ts
git commit -m "feat: integrate TagCategoryService in sync manager"
```

---

## Task 5: 构建和测试

**Files:**
- Test: 项目根目录

- [ ] **Step 1: 运行 lint 检查**

```bash
pnpm lint
```

Expected: 无错误

- [ ] **Step 2: 运行构建**

```bash
pnpm build
```

Expected: 构建成功

- [ ] **Step 3: Commit 最终修改**

```bash
git add -A
git commit -m "feat: complete TagCategoryService implementation"
```

---

## Task 6: 更新文档

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: 更新 CHANGELOG.md**

在 `CHANGELOG.md` 中添加：

```markdown
## [Unreleased]

### Added

- TagCategoryService: 支持在发布时自动将 frontmatter 中的 tags/categories 显示名称转换为 Halo API 所需的内部名称
- 自动创建不存在的标签/分类
- 将内部名称保存到 halo 字段，避免重复转换
- 与原版 obsidian-halo 插件的 frontmatter 结构兼容
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for TagCategoryService"
```
