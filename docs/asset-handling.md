# 附件处理技术手册

## 概述

`AssetHandler` 负责将 Obsidian 笔记中引用的本地资源（图片、视频、音频、文档等）上传到 Halo 博客，并将渲染后 HTML 中的本地路径替换为 Halo 的永久链接。

**核心源码：** `src/content/asset-handler.ts`

---

## 整体架构

```mermaid
graph TB
    A[用户点击发布] --> B[渲染笔记为 HTML]
    B --> C[AssetHandler.processAssets]
    C --> D[扫描本地资源]
    D --> E[校验文件大小]
    E --> F[缓存验证]
    F --> G{缓存有效?}
    G -->|是| H[使用缓存 permalink]
    G -->|否| I[上传到 Halo]
    H --> J[替换 HTML 引用]
    I --> J
    J --> K[返回处理后的 HTML]
    K --> L[发布文章到 Halo]

    style C fill:#e1f5fe
    style D fill:#fff3e0
    style F fill:#fff3e0
    style I fill:#ffebee
    style J fill:#e8f5e9
```

---

## 处理流程详解

### 1. 资源扫描

从渲染后的 HTML 中扫描所有本地资源引用，按元素类型分类：

```mermaid
graph LR
    HTML[渲染后 HTML] --> SCAN[extractLocalFiles]
    SCAN --> IMG[img 标签]
    SCAN --> VIDEO[video 标签]
    SCAN --> SOURCE[source 标签]
    SCAN --> A[a 标签]
    SCAN --> EMBED[file-embed 元素]

    IMG --> |src 属性| PATH[解析路径]
    VIDEO --> |src 属性| PATH
    SOURCE --> |src 属性| PATH
    A --> |href 属性| PATH
    EMBED --> |src 属性| PATH

    PATH --> RESULT[本地资源列表]
```

**元素类型说明：**

| 类型 | HTML 元素 | 典型场景 |
|------|-----------|----------|
| `img` | `<img src="...">` | `![[image.png]]` |
| `video` | `<video src="...">` | `![[video.mp4]]` |
| `source` | `<source src="...">` | `<video>` 内的备用源 |
| `a` | `<a href="...">` | `[文件](./file.pdf)` |
| `embed` | `<span class="internal-embed file-embed" src="...">` | `![[file.exe]]` |

### 2. 路径解析

将 HTML 中的原始路径（`originalSrc`）解析为 Vault 内的相对路径：

```mermaid
flowchart TD
    SRC[原始 src 路径] --> CHECK1{以 http/https 开头?}
    CHECK1 -->|是| SKIP[跳过 - 远程资源]
    CHECK1 -->|否| CHECK2{以 app:// 开头?}
    CHECK2 -->|是| APP[解析 app:// 协议路径]
    CHECK2 -->|否| CHECK3{Obsidian 链接解析}
    CHECK3 -->|找到| RETURN[返回 vault 相对路径]
    CHECK3 -->|未找到| CHECK4{以 / 开头?}
    CHECK4 -->|是| ABS[按绝对路径查找]
    CHECK4 -->|否| NULL[返回 null]

    APP --> RETURN
    ABS --> RETURN
    ABS --> NULL

    style SKIP fill:#ffcdd2
    style RETURN fill:#c8e6c9
    style NULL fill:#ffcdd2
```

**app:// 协议路径示例：**
```
app://ed57bb6f707b970d7cb342167cfe448b73b7/D:/Data/Notes/vault/image.png?1779936055537
                ↓ 解析为
image.png（vault 内相对路径）
```

### 3. 图片分类

根据文件扩展名判断是否为图片：

```mermaid
graph LR
    FILE[文件路径] --> EXT[提取扩展名]
    EXT --> CHECK{在 imageExtensions 中?}
    CHECK -->|是| IMG[image]
    CHECK -->|否| ATT[attachment]
```

**默认图片扩展名：** `png, jpg, jpeg, gif, webp, svg, bmp`

可在设置中自定义，用逗号分隔。

### 4. 文件大小校验

```mermaid
flowchart TD
    FILE[文件] --> STAT[获取文件信息]
    STAT --> EXISTS{文件存在?}
    EXISTS -->|否| SKIP[跳过]
    EXISTS -->|是| SIZE{大小 <= maxSizeMB?}
    SIZE -->|是| PASS[加入有效列表]
    SIZE -->|否| WARN[记录警告，跳过]
```

**默认限制：** 100MB（可在设置中调整）

### 5. 缓存机制

```mermaid
sequenceDiagram
    participant H as AssetHandler
    participant HAPI as Halo API
    participant Cache as assetCache (frontmatter)

    H->>Cache: 读取现有缓存
    Cache-->>H: AssetCacheEntry[]

    loop 每个缓存条目
        H->>HAPI: getAttachment(name)
        alt 附件存在
            HAPI-->>H: 200 OK
            H->>H: 加入 validCacheEntries
        else 附件不存在
            HAPI-->>H: 404
            H->>H: 跳过（缓存失效）
        end
    end

    Note over H: 有效缓存直接使用，无需重新上传
```

**缓存数据结构（frontmatter）：**
```yaml
halo:
  assets:
    - localPath: "images/photo.png"
      permalink: "/upload/photo.png"
      attachmentName: "attachment-xxxx"
      assetType: "image"
    - localPath: "docs/file.pdf"
      permalink: "/upload/file.pdf"
      attachmentName: "attachment-yyyy"
      assetType: "attachment"
```

### 6. 上传流程

```mermaid
sequenceDiagram
    participant H as AssetHandler
    participant Vault as Obsidian Vault
    participant HAPI as Halo Upload API

    H->>Vault: readBinary(filePath)
    Vault-->>H: ArrayBuffer

    H->>H: 创建 FormData
    H->>H: append('file', blob, fileName)

    H->>HAPI: POST /apis/console.api.storage.halo.run/v1alpha1/attachments/-/upload
    HAPI-->>H: HaloAttachment

    H->>H: 提取 permalink 和 attachmentName
    H->>H: 存入 uploadedMap 和 newAssetCache
```

**处理模式：**

| 模式 | 图片 | 其他附件 |
|------|------|----------|
| `upload` | 上传到 Halo | 上传到 Halo |
| `base64` | 转为 Base64 嵌入 HTML | 不支持（记录警告） |

### 7. HTML 替换

替换策略因元素类型不同而异：

```mermaid
flowchart TD
    FILE[有效文件] --> TYPE{元素类型?}

    TYPE -->|img/video/source| MEDIA[设置 src 为 permalink]
    TYPE -->|a| LINK[设置 href 为 permalink]
    TYPE -->|embed| EMBED[特殊处理]

    EMBED --> FIND[查找 div.file-embed-title]
    FIND --> TEXT[找到文件名文本节点]
    TEXT --> WRAP[用 a 标签包裹文件名]
    WRAP --> DEL[删除空的 span.internal-embed]

    MEDIA --> DONE[替换完成]
    LINK --> DONE
    DEL --> DONE
```

**embed 类型的 HTML 结构（替换前）：**

```html
<p>
  <span alt="file.exe" src="file.exe"
        class="internal-embed file-embed mod-generic is-loaded">
  </span>
</p>
<div class="file-embed-title">
  <span class="file-embed-icon"><svg>...</svg></span>
  file.exe
</div>
```

**embed 类型的 HTML 结构（替换后）：**

```html
<p></p>
<div class="file-embed-title">
  <span class="file-embed-icon"><svg>...</svg></span>
  <a href="/upload/file.exe" target="_blank" download="file.exe">file.exe</a>
</div>
```

> **为什么用字符串替换 embed 类型？**
>
> `DOMParser` 会将块级元素 `<div>` 从行内元素 `<span>` 中分离为兄弟节点，
> 导致原始的嵌套结构被破坏。因此 embed 类型的替换在 DOM 层面操作
> `file-embed-title` 中的文本节点，而非尝试替换 `<span>` 元素本身。

---

## 数据流总览

```mermaid
graph TB
    subgraph 输入
        MD[Markdown 笔记]
        FM[Frontmatter 设置]
    end

    subgraph 渲染
        MD --> RENDER[PreviewRenderer]
        RENDER --> HTML[渲染后 HTML]
    end

    subgraph AssetHandler
        HTML --> SCAN[资源扫描]
        SCAN --> LOCAL[本地资源列表]
        LOCAL --> FILTER[大小过滤]
        FILTER --> VALID[有效资源列表]
        VALID --> CACHE{缓存检查}
        CACHE -->|命中| PERM[permalink]
        CACHE -->|未命中| UPLOAD[上传到 Halo]
        UPLOAD --> PERM
        PERM --> REPLACE[HTML 替换]
    end

    subgraph 输出
        REPLACE --> NEWHTML[处理后的 HTML]
        REPLACE --> NEWCACHE[更新后的 assetCache]
        NEWHTML --> PUBLISH[发布到 Halo]
        NEWCACHE --> FM2[写入 frontmatter]
    end

    style AssetHandler fill:#f5f5f5,stroke:#333
```

---

## 关键设计决策

### 为什么保存 `originalSrc`？

HTML 中的 `src`/`href` 属性是原始路径（如 `./image.png` 或 `app://...`），
而解析后的是 Vault 相对路径（如 `folder/image.png`）。替换时需要用原始路径
匹配 HTML 元素，因此必须同时保存两者。

### 为什么 embed 类型单独处理？

Obsidian 的文件嵌入使用 `<span class="internal-embed file-embed">` 结构，
但 `DOMParser` 会将 `<div>` 子元素从 `<span>` 中分离为兄弟节点。
直接操作 DOM 无法正确处理这种结构，因此改为操作 `file-embed-title`
中的文本节点。

### 缓存验证为什么需要远程调用？

附件可能在 Halo 后台被删除，本地缓存中的 `permalink` 会失效。
通过调用 `getAttachment` API 验证附件是否仍然存在，确保缓存的可靠性。

---

## 设置项

| 设置 | 路径 | 默认值 | 说明 |
|------|------|--------|------|
| 图片扩展名 | `imageHandling.imageExtensions` | `png,jpg,jpeg,gif,webp,svg,bmp` | 视为图片的扩展名列表 |
| 附件大小限制 | `attachmentHandling.maxSizeMB` | `100` | 单个附件最大 MB |
| 图片处理模式 | `imageHandling.defaultMode` | `upload` | `upload` 或 `base64` |
| Base64 质量 | `imageHandling.base64Quality` | `80` | Base64 压缩质量 (0-100) |
