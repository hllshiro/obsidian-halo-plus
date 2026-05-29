# Acceptance Criteria: 发布时图片上传功能

**Spec:** `docs/superpowers/specs/2026-05-29-image-upload-design.md`
**Date:** 2026-05-29
**Status:** Draft

---

## 范围说明

**第一版范围**: 仅支持图片的上传功能，其他附件（视频、音频等）使用 base64 内嵌。

**第二版 TODO**: 扩展支持其他附件类型的上传功能。

---

## Criteria

### 图片上传功能

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-001 | 本地图片应被上传到 Halo 附件 | Logic | 文章包含本地图片，imageMode 为 'upload' | 图片被上传到 Halo 服务器，返回 permalink |
| AC-002 | 文章中的图片链接应被替换为 permalink | Logic | 图片上传成功 | 文章 HTML 中的 img src 被替换为 Halo 返回的 permalink |
| AC-003 | 网络图片应被跳过 | Logic | 文章包含 http/https URL 的图片 | 网络图片保持原样，不上传 |
| AC-004 | base64 模式下图片应使用 base64 内嵌 | Logic | imageMode 为 'base64' | 图片被转换为 base64 内嵌到 HTML 中 |

### Loading 效果

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-005 | 发布按钮下方应显示 loading 效果 | UI interaction | 用户点击发布按钮 | 发布按钮下方显示文本 loading 效果 |
| AC-006 | loading 应显示当前处理步骤 | UI interaction | 发布过程中 | loading 文本应显示：正在渲染文章...、正在处理附件...、发现 N 张本地图片、正在上传附件 (1/N)、正在发布文章... |
| AC-007 | 图片上传进度应显示在 loading 中 | UI interaction | 文章包含多张本地图片 | loading 文本应显示：正在上传附件 (1/N)、正在上传附件 (2/N) 等 |
| AC-008 | 发布成功后 loading 应消失 | UI interaction | 文章发布成功 | loading 组件被移除 |
| AC-009 | 发布失败时 loading 应显示错误信息 | UI interaction | 文章发布失败 | loading 文本应显示错误信息 |

### 日志记录

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-010 | 图片上传成功应记录日志 | Logic | 图片上传成功 | 控制台输出：[ImageHandler] Uploaded: {filename} -> {permalink} |
| AC-011 | 图片上传失败应记录错误日志 | Logic | 图片上传失败 | 控制台输出错误日志，包含文件名和错误信息 |
| AC-012 | 发布过程应记录关键步骤日志 | Logic | 发布过程中 | 控制台输出：[doPublish] Rendering article...、[doPublish] Processing attachments...、[doPublish] Publishing article... |
| AC-013 | 发布成功应记录日志 | Logic | 文章发布成功 | 控制台输出：[doPublish] Article published: {title} |
| AC-014 | 发布失败应记录错误日志 | Logic | 文章发布失败 | 控制台输出：[doPublish] Failed: {error} |

### 兼容性

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-015 | 图片路径解析应支持多种格式 | Logic | 文章包含不同格式的图片路径 | 支持 app:// 协议、相对路径、绝对路径 |
| AC-016 | 其他附件应使用 base64 内嵌 | Logic | 文章包含视频、音频等其他附件 | 其他附件被转换为 base64 内嵌到 HTML 中 |

---

## 第二版 TODO

以下功能将在第二版实现：

1. 支持其他附件类型的上传功能
2. 设置界面区分图片和其他附件的处理模式
3. 支持批量上传附件
4. 附件去重功能
