# 移除 halo-sdk 重构计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. It will decide whether each batch should run in parallel or serial subagent mode and will pass only task-local context to each subagent. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 彻底移除 halo-sdk 和 halo-cli 包，去除 monorepo 结构，将必要的业务逻辑内联到插件中，直接使用 `@halo-dev/api-client`。

**Architecture:** 用一个轻量 `createHaloClient()` 工具函数替代 HaloClient 类（仅配置 axios + 调用官方工厂函数），将 PostService 和 AttachmentService 中实际使用的 3 处业务逻辑（~40行）内联到调用处。项目从 monorepo 扁平化为单包。

**Tech Stack:** `@halo-dev/api-client`, `axios`, `esbuild`, `biome`

---

## 文件结构变更总览

### 删除
- `packages/halo-sdk/` — 整个目录
- `packages/halo-cli/` — 整个目录
- `pnpm-workspace.yaml` — monorepo 配置

### 新建
- `src/halo-client.ts` — axios 实例创建 + 官方 API 工厂函数封装
- `src/types.ts` — 仅保留实际使用的类型（HaloPost, HaloContent, HaloAttachment）

### 修改
- `src/main.ts` — 替换 import，内联 get/restore/update/updateContent/create/delete/publish 逻辑
- `src/sync/sync-manager.ts` — 同上
- `src/content/image-handler.ts` — 替换 import，内联 get/upload 逻辑
- `package.json`（根） — 从 monorepo 根配置改为插件主 package.json
- `tsconfig.json`（根） — 从 base config 改为插件 tsconfig
- `.gitignore` — 移除 `packages/*/src` 的 negation 规则
- `deploy.sh` — 移除 `packages/obsidian-halo-plus/` 路径前缀
- `scripts/release.js` — 更新 package.json 路径
- `biome.json` — 保持不变

---

### Task 1: 创建 `src/types.ts` — 仅保留使用的类型

**Files:**
- Create: `packages/obsidian-halo-plus/src/types.ts`

从 halo-sdk 的 `types/post.ts` 和 `types/attachment.ts` 中提取实际使用的类型，移除所有未使用的类型（ListPostsParams, PostPage, ListedPost, TagService 相关, CategoryService 相关等）。

- [ ] **Step 1: 创建 types.ts**

```typescript
// src/types.ts

export interface HaloPost {
  apiVersion: 'content.halo.run/v1alpha1';
  kind: 'Post';
  metadata: {
    name: string;
    annotations?: Record<string, string>;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  spec: {
    title: string;
    slug: string;
    cover: string;
    deleted: boolean;
    publish: boolean;
    pinned: boolean;
    allowComment: boolean;
    visible: 'PUBLIC' | 'INTERNAL';
    priority: number;
    excerpt: { autoGenerate: boolean; raw: string };
    categories: string[];
    tags: string[];
    htmlMetas: Array<{ key: string; value: string }>;
    publishTime?: string;
    allowDownload?: boolean;
    headSnapshot?: string;
  };
}

export interface HaloContent {
  raw: string;
  content: string;
  rawType: 'HTML';
}

export interface HaloAttachment {
  apiVersion: 'storage.halo.run/v1alpha1';
  kind: 'Attachment';
  metadata: {
    name: string;
    annotations?: Record<string, string>;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  spec: {
    displayName: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mediaType: string;
    suffix: string;
    thumbPath?: string;
    tags?: string[];
  };
  status?: {
    phase: 'PENDING' | 'READY' | 'FAILED';
    permalink?: string;
    mediaType?: string;
    reason?: string;
  };
}
```

---

### Task 2: 创建 `src/halo-client.ts` — 轻量客户端工厂

**Files:**
- Create: `packages/obsidian-halo-plus/src/halo-client.ts`

替代 HaloClient 类。只做：创建 axios 实例 → 注入认证 header → 调用官方工厂函数。

- [ ] **Step 1: 创建 halo-client.ts**

```typescript
// src/halo-client.ts
import {
  createConsoleApiClient,
  createCoreApiClient,
  createPublicApiClient,
} from '@halo-dev/api-client';
import axios, { type AxiosInstance } from 'axios';

export interface HaloClientConfig {
  baseUrl: string;
  token: string;
  timeout?: number;
}

export interface HaloClient {
  consoleApi: ReturnType<typeof createConsoleApiClient>;
  coreApi: ReturnType<typeof createCoreApiClient>;
  publicApi: ReturnType<typeof createPublicApiClient>;
  httpClient: AxiosInstance;
}

export function createHaloClient(config: HaloClientConfig): HaloClient {
  const httpClient = axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout ?? 30000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
    },
  });

  return {
    consoleApi: createConsoleApiClient(httpClient),
    coreApi: createCoreApiClient(httpClient),
    publicApi: createPublicApiClient(httpClient),
    httpClient,
  };
}

export async function validateConnection(client: HaloClient): Promise<boolean> {
  try {
    await client.consoleApi.content.post.listPosts({ page: 0, size: 1 });
    return true;
  } catch {
    return false;
  }
}
```

---

### Task 3: 重构 `src/main.ts` — 替换 import 并内联业务逻辑

**Files:**
- Modify: `packages/obsidian-halo-plus/src/main.ts`

需要内联的逻辑：
1. `get(name)` → 单行 HTTP GET via UC API
2. `create(params)` → UUID + content annotation + 默认值 + HTTP POST
3. `update(name, params)` → GET + merge + PUT via UC API
4. `delete(name)` → 单行 consoleApi 调用
5. `restore(name)` → JSON Patch via consoleApi
6. `publish(name)` → 单行 HTTP PUT via UC API
7. `updateContent(name, content)` → GET draft → 注入 annotation → PUT

- [ ] **Step 1: 替换 main.ts 的 import 和 HaloClient/PostService 使用**

将 `import { HaloClient, type HaloPost, PostService } from '@obsidian-halo-plus/halo-sdk'` 替换为：
```typescript
import { type HaloClient, createHaloClient, validateConnection } from './halo-client';
import type { HaloPost, HaloContent } from './types';
```

在 `doPublish` 方法中，将：
```typescript
const client = new HaloClient({ baseUrl: site.url, token: site.token });
const isConnected = await client.validateConnection();
```
替换为：
```typescript
const client = createHaloClient({ baseUrl: site.url, token: site.token });
const isConnected = await validateConnection(client);
```

将 `deleteFromHalo` 方法中的：
```typescript
const client = new HaloClient({ baseUrl: site.url, token: site.token });
const postService = new PostService(client);
await postService.delete(frontmatter.halo.name);
```
替换为：
```typescript
const client = createHaloClient({ baseUrl: site.url, token: site.token });
await client.consoleApi.content.post.recyclePost({ name: frontmatter.halo.name });
```

在 `doPublish` 方法中，将所有 `postService.xxx()` 调用替换为内联的 HTTP 调用：

```typescript
// 替换 postService.get(name)
const getResponse = await client.httpClient.get(`/apis/uc.api.content.halo.run/v1alpha1/posts/${name}`);
const existingPost = getResponse.data as HaloPost;

// 替换 postService.restore(name)
const restoreResponse = await client.consoleApi.content.post.patchPost({
  name,
  jsonPatchInner: [{ op: 'add', path: '/spec/deleted', value: false }],
});
const restoredPost = restoreResponse.data as HaloPost;

// 替换 postService.create(params)
const postName = crypto.randomUUID();
const contentData = { rawType: 'HTML', raw: processedHTML, content: processedHTML };
const newPost: Post = {
  apiVersion: 'content.halo.run/v1alpha1',
  kind: 'Post',
  metadata: {
    name: postName,
    annotations: { 'content.halo.run/content-json': JSON.stringify(contentData) },
  },
  spec: {
    title: effectiveTitle,
    slug: effectiveSlug,
    cover: (currentFrontmatter.cover as string) || '',
    deleted: false,
    publish: this.settings.publishBehavior.publishByDefault,
    pinned: false,
    allowComment: true,
    visible: 'PUBLIC',
    priority: 0,
    excerpt: { autoGenerate: true, raw: (currentFrontmatter.excerpt as string) || '' },
    categories: (currentFrontmatter.categories as string[]) || [],
    tags: (currentFrontmatter.tags as string[]) || [],
    htmlMetas: [],
  },
};
const createResponse = await client.httpClient.post('/apis/uc.api.content.halo.run/v1alpha1/posts', newPost);

// 替换 postService.update(name, params) — GET + merge + PUT
const existingResponse = await client.httpClient.get(`/apis/uc.api.content.halo.run/v1alpha1/posts/${name}`);
const existing = existingResponse.data;
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
    categories: (currentFrontmatter.categories as string[]) ?? existing.spec.categories,
    tags: (currentFrontmatter.tags as string[]) ?? existing.spec.tags,
  },
};
const updateResponse = await client.httpClient.put(`/apis/uc.api.content.halo.run/v1alpha1/posts/${name}`, postToUpdate);

// 替换 postService.updateContent(name, content)
const draftResponse = await client.httpClient.get(`/apis/uc.api.content.halo.run/v1alpha1/posts/${name}/draft?patched=true`);
const snapshot = draftResponse.data;
snapshot.metadata.annotations = {
  ...snapshot.metadata.annotations,
  'content.halo.run/content-json': JSON.stringify({ rawType: 'HTML', raw: processedHTML, content: processedHTML }),
};
await client.httpClient.put(`/apis/uc.api.content.halo.run/v1alpha1/posts/${name}/draft`, snapshot);

// 替换 postService.publish(name)
await client.httpClient.put(`/apis/uc.api.content.halo.run/v1alpha1/posts/${name}/publish`);
```

同时移除 `import type { Post, PostSpec } from '@halo-dev/api-client'` — 需要在 main.ts 中添加此 import（用于 create 时的类型构造）。

- [ ] **Step 2: 运行 lint 验证**

```bash
pnpm lint
```

---

### Task 4: 重构 `src/sync/sync-manager.ts` — 同样的替换

**Files:**
- Modify: `packages/obsidian-halo-plus/src/sync/sync-manager.ts`

与 main.ts 相同的模式：替换 import，内联所有 PostService 调用。

- [ ] **Step 1: 替换 sync-manager.ts 的 import 和所有 PostService 调用**

参考 Task 3 中 main.ts 的替换模式，对 sync-manager.ts 做相同的 import 替换和业务逻辑内联。

- [ ] **Step 2: 运行 lint 验证**

```bash
pnpm lint
```

---

### Task 5: 重构 `src/content/image-handler.ts` — 内联 AttachmentService

**Files:**
- Modify: `packages/obsidian-halo-plus/src/content/image-handler.ts`

需要内联的逻辑：
1. `get(name)` → 单行 HTTP GET
2. `upload(params)` → FormData 构造 + HTTP POST

- [ ] **Step 1: 替换 image-handler.ts 的 import 和 AttachmentService 调用**

将：
```typescript
import { AttachmentService, type HaloClient } from '@obsidian-halo-plus/halo-sdk';
```
替换为：
```typescript
import type { HaloClient } from '../halo-client';
import type { HaloAttachment } from '../types';
```

将 `attachmentService.get(name)` 替换为：
```typescript
const response = await client.httpClient.get(`/apis/api.console.halo.run/v1alpha1/attachments/${name}`);
return response.data as HaloAttachment;
```

将 `attachmentService.upload(params)` 替换为：
```typescript
const formData = new FormData();
if (params.file instanceof Blob) {
  formData.append('file', params.file, params.filename);
} else {
  const blob = new Blob([params.file], { type: params.mimeType });
  formData.append('file', blob, params.filename);
}
const response = await client.httpClient.post(
  '/apis/console.api.storage.halo.run/v1alpha1/attachments/-/upload',
  formData,
  { headers: { 'Content-Type': 'multipart/form-data' } },
);
return response.data as HaloAttachment;
```

- [ ] **Step 2: 运行 lint 验证**

```bash
pnpm lint
```

---

### Task 6: 扁平化项目结构 — 移动文件、删除 packages/

**Files:**
- Move: `packages/obsidian-halo-plus/*` → 根目录
- Delete: `packages/halo-sdk/`, `packages/halo-cli/`
- Delete: `pnpm-workspace.yaml`

- [ ] **Step 1: 移动插件文件到根目录**

```bash
# 移动 src/ 到根目录
mv packages/obsidian-halo-plus/src ./src
# 移动其他插件文件
mv packages/obsidian-halo-plus/esbuild.config.mjs ./esbuild.config.mjs
mv packages/obsidian-halo-plus/version-bump.mjs ./version-bump.mjs 2>/dev/null || true
mv packages/obsidian-halo-plus/styles.css ./styles.css 2>/dev/null || true
mv packages/obsidian-halo-plus/tsconfig.json ./tsconfig.json
```

- [ ] **Step 2: 删除 packages/ 和 workspace 配置**

```bash
rm -rf packages/halo-sdk packages/halo-cli packages/obsidian-halo-plus
rm pnpm-workspace.yaml
```

- [ ] **Step 3: 更新根 package.json**

将根 `package.json` 改为插件主 package.json：

```json
{
  "name": "obsidian-halo-plus",
  "version": "0.3.1",
  "description": "Publish Obsidian notes to Halo blog with native rendering support",
  "main": "dist/main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "node esbuild.config.mjs production",
    "version": "node version-bump.mjs && git add manifest.json versions.json",
    "lint": "biome check src/",
    "lint:fix": "biome check src/ --write",
    "format": "biome format src/ --write",
    "deploy:local": "./deploy.sh"
  },
  "dependencies": {
    "@halo-dev/api-client": "^2.24.0",
    "axios": "^1.6.0",
    "gray-matter": "^4.0.3",
    "i18next": "^23.7.0",
    "transliteration": "^2.3.5"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.5.3",
    "@types/node": "^20.10.0",
    "builtin-modules": "^3.3.0",
    "esbuild": "^0.19.0",
    "husky": "^9.1.7",
    "obsidian": "latest",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=16.0.0"
  },
  "license": "MIT"
}
```

- [ ] **Step 4: 更新 tsconfig.json**

合并 tsconfig.base.json 和原 packages/obsidian-halo-plus/tsconfig.json：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

删除 `tsconfig.base.json`。

- [ ] **Step 5: 更新 .gitignore**

移除与 packages/ 相关的 negation 规则：
```
!packages/*/src/**/*.ts
!packages/halo-cli/src/index.ts
!packages/obsidian-halo-plus/esbuild.config.mjs
!packages/obsidian-halo-plus/version-bump.mjs
```
替换为：
```
!esbuild.config.mjs
!version-bump.mjs
!src/**/*.ts
```

- [ ] **Step 6: 更新 deploy.sh**

将：
```bash
cp packages/obsidian-halo-plus/dist/main.js "$DEPLOY_TARGET_DIR/"
cp packages/obsidian-halo-plus/dist/styles.css "$DEPLOY_TARGET_DIR/"
```
替换为：
```bash
cp dist/main.js "$DEPLOY_TARGET_DIR/"
cp dist/styles.css "$DEPLOY_TARGET_DIR/"
```

- [ ] **Step 7: 更新 scripts/release.js**

将 package.json 路径从 `packages/obsidian-halo-plus/package.json` 改为根目录 `package.json`：
```javascript
// 删除旧的 plugin package.json 更新逻辑（第 56-66 行）
// 改为直接更新根 package.json
const rootPackagePath = path.join(projectRoot, 'package.json');
```

更新 git add 路径：
```javascript
execSync('git add manifest.json versions.json package.json', { cwd: projectRoot });
```

---

### Task 7: 安装依赖并验证构建

**Files:** 无新建/修改

- [ ] **Step 1: 删除旧 node_modules 并重新安装**

```bash
rm -rf node_modules packages/*/node_modules
rm pnpm-lock.yaml
pnpm install
```

- [ ] **Step 2: 运行 lint**

```bash
pnpm lint
```

- [ ] **Step 3: 运行构建**

```bash
pnpm build
```

验证 `dist/main.js` 正常生成。

- [ ] **Step 4: 检查 TypeScript 类型**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: 验证 dist/main.js 不包含 @halo-dev/api-client 和 axios 的源码（它们应被 externalize）**

```bash
grep -c "createConsoleApiClient" dist/main.js  # 应该是 0（被 externalized）
```

---

### Task 8: 清理 halo-sdk 中未使用的 esbuild external 配置

**Files:**
- Modify: `esbuild.config.mjs`（已在根目录）

确认 esbuild 配置中 `@halo-dev/api-client` 和 `axios` 被正确 externalize（它们现在是插件的直接依赖，但 Obsidian 环境下这些库由插件打包提供，不应被 externalize）。

实际上，由于 Obsidian 插件是纯 CJS bundle，`@halo-dev/api-client` 和 `axios` **应该被打包进 main.js**，不应被 externalize。当前 halo-sdk 的构建中它们被 externalized 是因为 halo-sdk 作为独立包构建。现在它们是插件的直接依赖，esbuild 会自动打包它们。

- [ ] **Step 1: 确认 esbuild 不需要额外配置**

检查 esbuild.config.mjs 中的 external 列表，确认没有 `@halo-dev/api-client` 或 `axios`。当前配置中没有，无需修改。

- [ ] **Step 2: 验证打包后的 main.js 包含这些依赖**

```bash
grep -c "axios" dist/main.js  # 应该 > 0
```
