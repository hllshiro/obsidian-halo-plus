# 发布时图片上传功能设计

## 概述

实现发布文章时，将文章内的本地图片上传到 Halo 附件，并替换文章中的图片链接为 Halo 返回的 permalink。同时增加关键日志和进度提示，便于排查问题。

## 背景

当前 `ImageHandler` 的 `upload` 模式有 TODO 注释，实际上传功能尚未完成。两种模式（upload 和 base64）都使用 Base64 内嵌。SDK 已经实现了 `AttachmentService`，支持上传附件。

## 需求

1. 发布文章时，将文章内的本地图片上传到 Halo 附件
2. 使用 Halo 返回的 permalink 替换文章中的图片链接
3. 网络图片（http/https URL）跳过不处理
4. 在发布按钮下方用文本 loading 效果显示进度
5. 增加关键日志便于排查问题

## 设计方案

### 1. 修改 ImageHandler 类

**文件**: `packages/obsidian-halo-plus/src/content/image-handler.ts`

**改动**:
1. 修改构造函数，接受 `HaloClient` 参数
2. 实现 `upload` 模式：
   - 使用 `AttachmentService.upload()` 上传图片
   - 获取返回的 permalink
   - 替换 `<img>` 标签的 `src`
3. 添加日志记录

**核心逻辑**:
```typescript
async processImages(
  html: string,
  currentFile: TFile,
  client: HaloClient,
  mode: 'upload' | 'base64' = 'upload',
  quality = 80,
  loading?: PublishLoading,
): Promise<string> {
  // 解析 HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const images = doc.querySelectorAll('img');

  const localImages = Array.from(images).filter(img => {
    const src = img.getAttribute('src');
    return src && !src.startsWith('http://') && !src.startsWith('https://');
  });

  // Loading: 发现 N 张本地图片
  if (localImages.length > 0 && loading) {
    loading.updateText(`发现 ${localImages.length} 张本地图片`);
  }

  let uploadedCount = 0;
  for (const img of localImages) {
    const src = img.getAttribute('src');
    const localPath = await this.resolveImagePath(src, currentFile);
    if (!localPath) continue;

    // 读取图片
    const imageBuffer = await this.app.vault.adapter.readBinary(localPath);
    const mimeType = this.getMimeType(localPath);

    if (mode === 'upload') {
      // Loading: 正在上传附件 (N/M)
      if (loading) {
        loading.updateText(`正在上传附件 (${uploadedCount + 1}/${localImages.length})`);
      }

      // 上传到 Halo
      const blob = new Blob([imageBuffer], { type: mimeType });
      const fileName = localPath.split('/').pop() || 'image.png';
      const attachmentService = new AttachmentService(client);
      const result = await attachmentService.upload(blob, fileName);

      // 替换为 permalink
      img.setAttribute('src', result.permalink);
      uploadedCount++;

      console.log(`[ImageHandler] Uploaded: ${fileName} -> ${result.permalink}`);
    } else {
      // Base64 内嵌
      const base64 = await this.imageToBase64(imageBuffer, mimeType, quality);
      img.setAttribute('src', `data:${mimeType};base64,${base64}`);
    }
  }

  return doc.body.innerHTML;
}
```

### 2. 创建 Loading 组件

**新文件**: `packages/obsidian-halo-plus/src/ui/publish-loading.ts`

**功能**:
- 显示在发布按钮下方
- 可以动态更新文本内容
- 支持显示进度（如：正在上传附件 1/3）

**核心代码**:
```typescript
import { Component } from 'obsidian';

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

  updateText(text: string): void {
    this.textEl.textContent = text;
  }

  onunload(): void {
    this.containerEl.remove();
  }
}
```

### 3. 修改 PublishPreviewModal

**文件**: `packages/obsidian-halo-plus/src/ui/publish-preview-modal.ts`

**改动**:
1. 在发布按钮下方添加 Loading 组件
2. 将 Loading 组件传递给 `doPublish`
3. 在发布完成后移除 Loading

### 4. 修改 doPublish 函数

**文件**: `packages/obsidian-halo-plus/src/main.ts`

**改动**:
1. 接受 `PublishLoading` 参数
2. 使用 Loading 组件显示进度

**核心逻辑**:
```typescript
private async doPublish(
  file: TFile,
  frontmatter: Record<string, unknown>,
  site: HaloSite,
  imageMode: 'upload' | 'base64',
  loading: PublishLoading,
): Promise<void> {
  try {
    // ... 连接验证
    
    // Loading: 正在渲染
    loading.updateText('正在渲染文章...');
    
    const renderer = new PreviewRenderer(this.app, component);
    const renderResult = await renderer.renderFile(file);
    const renderedHTML = renderResult.viewEl.innerHTML;
    renderResult.cleanup();
    
    // Loading: 正在处理附件
    loading.updateText('正在处理附件...');
    
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
    
    const postService = new PostService(client);
    // ... 创建或更新文章
    
    console.log(`[doPublish] Article published: ${effectiveTitle}`);
  } catch (error) {
    console.error('[doPublish] Failed:', error);
    throw error;
  }
}
```

### 5. 添加 CSS 样式

**文件**: `packages/obsidian-halo-plus/styles.css`

**添加**:
```css
.halo-plus-publish-loading {
  margin-top: 8px;
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

@keyframes halo-plus-dots {
  0%, 20% { content: ''; }
  40% { content: '.'; }
  60% { content: '..'; }
  80%, 100% { content: '...'; }
}
```

## 日志记录规范

**格式**: `[模块名] 操作描述`

**关键日志点**:
1. `[ImageHandler] Found N local images` - 发现本地图片
2. `[ImageHandler] Uploaded: {filename} -> {permalink}` - 图片上传成功
3. `[ImageHandler] Skipped: {src} (network URL)` - 跳过网络图片
4. `[doPublish] Rendering article...` - 开始渲染
5. `[doPublish] Processing attachments...` - 开始处理附件
6. `[doPublish] Publishing article...` - 开始发布
7. `[doPublish] Article published: {title}` - 发布成功
8. `[doPublish] Failed: {error}` - 发布失败

## 文件清单

| 文件 | 操作 |
|------|------|
| `packages/obsidian-halo-plus/src/content/image-handler.ts` | 修改 |
| `packages/obsidian-halo-plus/src/ui/publish-loading.ts` | 新建 |
| `packages/obsidian-halo-plus/src/ui/publish-preview-modal.ts` | 修改 |
| `packages/obsidian-halo-plus/src/main.ts` | 修改 |
| `packages/obsidian-halo-plus/styles.css` | 修改 |
