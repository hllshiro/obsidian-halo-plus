# 发布时图片上传功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. It will decide whether each batch should run in parallel or serial subagent mode and will pass only task-local context to each subagent. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现发布文章时将本地图片上传到 Halo 附件，并替换文章中的图片链接为 permalink，同时增加进度提示和关键日志。

**Architecture:** 修改 `ImageHandler` 类实现 `upload` 模式，创建 `PublishLoading` 组件显示进度，修改 `doPublish` 函数协调整个流程。

**Tech Stack:** TypeScript, Obsidian API, Halo SDK (AttachmentService)

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `packages/obsidian-halo-plus/src/content/image-handler.ts` | 修改 | 实现图片上传逻辑 |
| `packages/obsidian-halo-plus/src/ui/publish-loading.ts` | 新建 | 进度提示组件 |
| `packages/obsidian-halo-plus/src/ui/publish-preview-modal.ts` | 修改 | 集成进度提示 |
| `packages/obsidian-halo-plus/src/main.ts` | 修改 | 协调发布流程 |
| `packages/obsidian-halo-plus/styles.css` | 修改 | 添加 loading 样式 |

---

## Task 1: 创建 PublishLoading 组件

**Files:**
- Create: `packages/obsidian-halo-plus/src/ui/publish-loading.ts`

- [ ] **Step 1: 创建 PublishLoading 类**

```typescript
import { Component } from 'obsidian';

/**
 * 发布进度提示组件
 *
 * 显示在发布按钮下方，动态更新文本内容
 */
export class PublishLoading extends Component {
  private containerEl: HTMLElement;
  private textEl: HTMLElement;

  constructor(private readonly parentEl: HTMLElement) {
    super();
  }

  onload(): void {
    this.containerEl = this.parentEl.createEl('div', {
      cls: 'halo-plus-publish-loading',
    });
    this.textEl = this.containerEl.createEl('span', {
      cls: 'halo-plus-publish-loading-text',
    });
  }

  /**
   * 更新提示文本
   */
  updateText(text: string): void {
    this.textEl.textContent = text;
  }

  /**
   * 显示错误信息
   */
  showError(error: string): void {
    this.textEl.textContent = error;
    this.textEl.classList.add('halo-plus-publish-loading-error');
  }

  onunload(): void {
    this.containerEl.remove();
  }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add packages/obsidian-halo-plus/src/ui/publish-loading.ts
git commit -m "feat: add PublishLoading component for publish progress"
```

---

## Task 2: 修改 PublishPreviewModal 集成 Loading

**Files:**
- Modify: `packages/obsidian-halo-plus/src/ui/publish-preview-modal.ts:229-270`

- [ ] **Step 1: 添加 Loading 组件导入和状态**

在文件开头添加导入：
```typescript
import { PublishLoading } from './publish-loading';
```

在类中添加属性：
```typescript
private loading: PublishLoading | null = null;
```

- [ ] **Step 2: 修改按钮区域，添加 Loading 容器**

将 `renderSidebar` 方法中的按钮区域修改为：

```typescript
    // 按钮区域
    const buttonSection = container.createDiv({ cls: 'halo-plus-sidebar-buttons' });

    // 按钮行
    const buttonRow = buttonSection.createDiv({ cls: 'halo-plus-sidebar-button-row' });

    // 取消按钮
    const cancelBtn = buttonRow.createEl('button', {
      text: t('modals.publish.cancel'),
      cls: 'halo-plus-btn halo-plus-btn-cancel',
    });
    cancelBtn.addEventListener('click', () => {
      this.close();
    });

    // 发布按钮
    const publishBtn = buttonRow.createEl('button', {
      text: t('modals.publish.publish'),
      cls: 'halo-plus-btn halo-plus-btn-publish mod-cta',
    });

    // Loading 容器（按钮行下方，独立行）
    const loadingContainer = buttonSection.createDiv({
      cls: 'halo-plus-publish-loading-container',
    });

    publishBtn.addEventListener('click', async () => {
      if (this.isPublishing) return;

      this.isPublishing = true;
      publishBtn.setText(t('modals.publish.publishing'));
      publishBtn.disabled = true;

      // 创建 Loading 组件
      this.loading = new PublishLoading(loadingContainer);
      this.loading.load();

      try {
        if (this.onPublish) {
          await this.onPublish(this.selectedSite, this.imageMode);
        }
        this.close();
      } catch (error) {
        // 显示错误信息
        if (this.loading) {
          this.loading.showError(
            t('modals.publish.failedToPublish', {
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          );
        }
        // 延迟关闭，让用户看到错误信息
        await new Promise((resolve) => setTimeout(resolve, 2000));
        this.close();
      } finally {
        this.isPublishing = false;
        publishBtn.setText(t('modals.publish.publish'));
        publishBtn.disabled = false;
        // 清理 Loading
        if (this.loading) {
          this.loading.unload();
          this.loading = null;
        }
      }
    });
```

- [ ] **Step 3: 修改 setOnPublish 回调签名**

将回调签名修改为：
```typescript
setOnPublish(callback: (site: HaloSite, imageMode: 'upload' | 'base64', loading: PublishLoading) => Promise<void>): void {
  this.onPublish = callback;
}
```

- [ ] **Step 4: 修改 onPublish 调用，传入 loading**

```typescript
if (this.onPublish && this.loading) {
  await this.onPublish(this.selectedSite, this.imageMode, this.loading);
}
```

- [ ] **Step 5: 提交代码**

```bash
git add packages/obsidian-halo-plus/src/ui/publish-preview-modal.ts
git commit -m "feat: integrate PublishLoading into PublishPreviewModal"
```

---

## Task 3: 修改 ImageHandler 实现上传逻辑

**Files:**
- Modify: `packages/obsidian-halo-plus/src/content/image-handler.ts`

- [ ] **Step 1: 添加导入**

```typescript
import { type App, TFile } from 'obsidian';
import { HaloClient, AttachmentService } from '@obsidian-halo-plus/halo-sdk';
import type { PublishLoading } from '../ui/publish-loading';
```

- [ ] **Step 2: 修改 processImages 方法签名**

```typescript
async processImages(
  html: string,
  currentFile: TFile,
  client?: HaloClient,
  mode: 'upload' | 'base64' = 'upload',
  quality = 80,
  loading?: PublishLoading,
): Promise<string>
```

- [ ] **Step 3: 实现 upload 模式**

```typescript
async processImages(
  html: string,
  currentFile: TFile,
  client?: HaloClient,
  mode: 'upload' | 'base64' = 'upload',
  quality = 80,
  loading?: PublishLoading,
): Promise<string> {
  // 解析 HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const images = doc.querySelectorAll('img');

  // 筛选本地图片
  const localImages = Array.from(images).filter((img) => {
    const src = img.getAttribute('src');
    if (!src) return false;
    // 跳过网络图片
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return false;
    }
    return true;
  });

  // Loading: 发现本地图片
  if (localImages.length > 0 && loading) {
    loading.updateText(`发现 ${localImages.length} 张本地图片`);
    console.log(`[ImageHandler] Found ${localImages.length} local images`);
  }

  let uploadedCount = 0;
  for (const img of localImages) {
    const src = img.getAttribute('src');
    if (!src) continue;

    try {
      // 解析图片路径
      const localPath = await this.resolveImagePath(src, currentFile);
      if (!localPath) continue;

      // 读取图片文件
      const imageBuffer = await this.app.vault.adapter.readBinary(localPath);
      const mimeType = this.getMimeType(localPath);

      if (mode === 'upload' && client) {
        // Loading: 正在上传附件
        if (loading) {
          loading.updateText(`正在上传附件 (${uploadedCount + 1}/${localImages.length})`);
        }

        // 上传到 Halo
        const blob = new Blob([imageBuffer], { type: mimeType });
        const fileName = localPath.split('/').pop() || 'image.png';
        const attachmentService = new AttachmentService(client);
        const result = await attachmentService.upload({
          file: blob,
          filename: fileName,
          mimeType: mimeType,
        });

        // 替换为 permalink
        img.setAttribute('src', result.permalink);
        uploadedCount++;

        console.log(`[ImageHandler] Uploaded: ${fileName} -> ${result.permalink}`);
      } else {
        // Base64 内嵌
        const base64 = await this.imageToBase64(imageBuffer, mimeType, quality);
        img.setAttribute('src', `data:${mimeType};base64,${base64}`);
      }
    } catch (error) {
      console.error(`[ImageHandler] Failed to process image: ${src}`, error);
    }
  }

  return doc.body.innerHTML;
}
```

- [ ] **Step 4: 提交代码**

```bash
git add packages/obsidian-halo-plus/src/content/image-handler.ts
git commit -m "feat: implement image upload in ImageHandler"
```

---

## Task 4: 修改 doPublish 协调流程

**Files:**
- Modify: `packages/obsidian-halo-plus/src/main.ts:181-280`

- [ ] **Step 1: 添加 PublishLoading 导入**

```typescript
import { PublishLoading } from './ui/publish-loading';
```

- [ ] **Step 2: 修改 doPublish 方法签名**

```typescript
private async doPublish(
  file: TFile,
  frontmatter: Record<string, unknown>,
  site: HaloSite,
  imageMode: 'upload' | 'base64',
  loading: PublishLoading,
): Promise<void>
```

- [ ] **Step 3: 修改 doPublish 方法实现**

```typescript
private async doPublish(
  file: TFile,
  frontmatter: Record<string, unknown>,
  site: HaloSite,
  imageMode: 'upload' | 'base64',
  loading: PublishLoading,
): Promise<void> {
  try {
    const client = new HaloClient({
      baseUrl: site.url,
      token: site.token,
    });

    const isConnected = await client.validateConnection();
    if (!isConnected) {
      new Notice(t('notices.connectionFailed'));
      return;
    }

    const component = new Component();
    component.load();

    try {
      // Loading: 正在渲染
      loading.updateText('正在渲染文章...');
      console.log('[doPublish] Rendering article...');

      const renderer = new PreviewRenderer(this.app, component);
      const renderResult = await renderer.renderFile(file);
      const renderedHTML = renderResult.viewEl.innerHTML;
      renderResult.cleanup();

      // Loading: 正在处理附件
      loading.updateText('正在处理附件...');
      console.log('[doPublish] Processing attachments...');

      const imageHandler = new ImageHandler(this.app);
      const processedHTML = await imageHandler.processImages(
        renderedHTML,
        file,
        client,
        imageMode,
        this.settings.imageHandling.base64Quality,
        loading,
      );

      // Loading: 正在发布文章
      loading.updateText('正在发布文章...');
      console.log('[doPublish] Publishing article...');

      const postService = new PostService(client);
      let post: HaloPost | undefined;
      const effectiveTitle = (frontmatter.title as string) || file.basename;
      const effectiveSlug = (frontmatter.slug as string) || generateSlug(effectiveTitle);

      if (frontmatter.halo?.name) {
        post = await postService.update(frontmatter.halo.name as string, {
          title: effectiveTitle,
          slug: effectiveSlug,
          tags: frontmatter.tags as string[],
          categories: frontmatter.categories as string[],
          cover: frontmatter.cover as string,
          excerpt: frontmatter.excerpt as string,
        });

        await postService.updateContent(frontmatter.halo.name as string, {
          raw: processedHTML,
          content: processedHTML,
          rawType: 'HTML',
        });

        if (this.settings.publishBehavior.publishByDefault) {
          await postService.publish(frontmatter.halo.name as string);
        }

        console.log(`[doPublish] Article updated: ${effectiveTitle}`);
      } else {
        post = await postService.create({
          title: effectiveTitle,
          slug: effectiveSlug,
          tags: frontmatter.tags as string[],
          categories: frontmatter.categories as string[],
          cover: frontmatter.cover as string,
          excerpt: frontmatter.excerpt as string,
          publish: this.settings.publishBehavior.publishByDefault,
          content: processedHTML,
        });

        console.log(`[doPublish] Article created: ${effectiveTitle}`);
      }

      if (post) {
        await this.updateFrontMatter(file, {
          title: effectiveTitle,
          slug: effectiveSlug,
          halo: {
            site: site.url,
            name: post.metadata.name,
            publish: this.settings.publishBehavior.publishByDefault,
          },
        });
      }

      console.log(`[doPublish] Article published: ${effectiveTitle}`);
    } finally {
      component.unload();
    }
  } catch (error) {
    console.error('[doPublish] Failed:', error);
    throw error;
  }
}
```

- [ ] **Step 4: 修改 publishToHalo 方法调用**

```typescript
async publishToHalo(file: TFile): Promise<void> {
  if (this.settings.sites.length === 0) {
    new Notice(t('notices.siteNotConfigured'));
    return;
  }

  const content = await this.app.vault.read(file);
  const frontmatter = parseFrontMatter(content);

  const modal = new PublishPreviewModal(this.app, file, this.settings, frontmatter);
  modal.setOnPublish(async (site, imageMode, loading) => {
    await this.doPublish(file, frontmatter, site, imageMode, loading);
  });
  modal.open();
}
```

- [ ] **Step 5: 提交代码**

```bash
git add packages/obsidian-halo-plus/src/main.ts
git commit -m "feat: integrate PublishLoading into doPublish flow"
```

---

## Task 5: 添加 CSS 样式

**Files:**
- Modify: `packages/obsidian-halo-plus/styles.css`

- [ ] **Step 1: 添加 loading 样式**

```css
/* 按钮行 */
.halo-plus-sidebar-button-row {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 发布进度提示 */
.halo-plus-publish-loading-container {
  margin-top: 8px;
}

.halo-plus-publish-loading {
  padding: 8px;
  background: var(--background-secondary);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.halo-plus-publish-loading-text {
  display: inline-block;
}

.halo-plus-publish-loading-text::after {
  content: '...';
  animation: halo-plus-dots 1.5s steps(4, end) infinite;
}

.halo-plus-publish-loading-error {
  color: var(--text-error);
}

@keyframes halo-plus-dots {
  0%, 20% {
    content: '';
  }
  40% {
    content: '.';
  }
  60% {
    content: '..';
  }
  80%, 100% {
    content: '...';
  }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add packages/obsidian-halo-plus/styles.css
git commit -m "style: add loading animation styles"
```

---

## Task 6: 验证和测试

- [ ] **Step 1: 构建项目**

```bash
pnpm build
```

- [ ] **Step 2: 运行 lint 检查**

```bash
pnpm lint
```

- [ ] **Step 3: 测试发布流程**

1. 创建包含本地图片的测试文章
2. 点击发布按钮
3. 验证：
   - Loading 效果正常显示
   - 图片被上传到 Halo 附件
   - 文章中的图片链接被替换为 permalink
   - 控制台输出正确的日志

- [ ] **Step 4: 测试 base64 模式**

1. 在发布预览中选择 base64 模式
2. 验证：
   - 图片被转换为 base64 内嵌
   - 不上传到 Halo 附件

- [ ] **Step 5: 测试网络图片**

1. 创建包含网络图片的文章
2. 验证：
   - 网络图片被跳过
   - 不上传到 Halo 附件

---

## 第二版 TODO

以下功能将在第二版实现：

1. 支持其他附件类型的上传功能（视频、音频等）
2. 设置界面区分图片和其他附件的处理模式
3. 支持批量上传附件
4. 附件去重功能
