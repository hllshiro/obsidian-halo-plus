# Acceptance Criteria: TagCategoryService

**Spec:** `docs/superpowers/specs/2026-06-02-tag-category-service-design.md`
**Date:** 2026-06-02
**Status:** Draft

---

## Criteria

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-001 | 创建 TagCategoryService 文件 | Logic | 项目目录存在 | `src/service/tag-category-service.ts` 文件存在，导出 `TagCategoryService` 类 |
| AC-002 | TagCategoryService 包含所有必需方法 | Logic | TagCategoryService 文件已创建 | 类包含以下方法：`getAllTags()`, `getAllCategories()`, `getTagNames()`, `getCategoryNames()`, `getTagDisplayNames()`, `getCategoryDisplayNames()` |
| AC-003 | FrontMatterData 接口扩展 | Logic | frontmatter-parser.ts 文件存在 | `FrontMatterData` 接口的 `halo` 属性包含 `tagNames?: string[]` 和 `categoryNames?: string[]` 字段 |
| AC-004 | 发布新文章时自动创建不存在的标签 | API | Halo 站点运行中，用户配置了有效的 Token | 在 frontmatter 中设置 `tags: ["NewTag1", "NewTag2"]`，发布后 Halo 中自动创建这两个标签，文章关联到这些标签 |
| AC-005 | 发布新文章时自动创建不存在的分类 | API | Halo 站点运行中，用户配置了有效的 Token | 在 frontmatter 中设置 `categories: ["NewCategory1"]`，发布后 Halo 中自动创建该分类，文章关联到该分类 |
| AC-006 | 发布新文章时使用已存在的标签 | API | Halo 站点中已存在标签 "JavaScript" | 在 frontmatter 中设置 `tags: ["JavaScript"]`，发布后文章关联到已存在的标签 |
| AC-007 | 发布新文章时使用已存在的分类 | API | Halo 站点中已存在分类 "前端开发" | 在 frontmatter 中设置 `categories: ["前端开发"]`，发布后文章关联到已存在的分类 |
| AC-008 | 发布后保存内部名称到 halo 字段 | Logic | 文章发布成功 | frontmatter 的 `halo.tagNames` 和 `halo.categoryNames` 包含标签/分类的内部名称（UUID 格式） |
| AC-009 | 更新文章时检测标签变化 | API | 文章已发布，frontmatter 包含 `halo.tagNames` | 修改 frontmatter 中的 `tags` 数组，重新发布后，Halo 中的文章关联到新的标签 |
| AC-010 | 更新文章时检测分类变化 | API | 文章已发布，frontmatter 包含 `halo.categoryNames` | 修改 frontmatter 中的 `categories` 数组，重新发布后，Halo 中的文章关联到新的分类 |
| AC-011 | 标签未变化时使用缓存的内部名称 | API | 文章已发布，frontmatter 包含 `halo.tagNames`，未修改 `tags` 数组 | 重新发布后，文章的标签关联不变，不调用 `getTagNames()` 方法 |
| AC-012 | 分类未变化时使用缓存的内部名称 | API | 文章已发布，frontmatter 包含 `halo.categoryNames`，未修改 `categories` 数组 | 重新发布后，文章的分类关联不变，不调用 `getCategoryNames()` 方法 |
| AC-013 | 处理空标签数组 | API | frontmatter 中 `tags` 为空数组或未设置 | 发布后文章没有标签关联，`halo.tagNames` 为空数组 |
| AC-014 | 处理空分类数组 | API | frontmatter 中 `categories` 为空数组或未设置 | 发布后文章没有分类关联，`halo.categoryNames` 为空数组 |
| AC-015 | 向后兼容旧格式文档 | API | frontmatter 中没有 `halo.tagNames` 和 `halo.categoryNames` 字段 | 发布时自动从显示名称转换，发布后保存内部名称到 halo 字段 |
| AC-016 | 自动同步功能支持标签/分类 | API | 自动同步功能已启用，文章在同步文件夹中 | 修改文章的 `tags` 或 `categories` 后，自动同步时正确处理标签/分类 |
| AC-017 | 错误处理：网络错误 | Logic | 网络连接失败 | 捕获错误，记录日志，提示用户检查网络连接 |
| AC-018 | 错误处理：标签创建失败 | API | 标签创建 API 调用失败 | 记录错误日志，继续处理其他标签，不影响文章发布 |
| AC-019 | 错误处理：分类创建失败 | API | 分类创建 API 调用失败 | 记录错误日志，继续处理其他分类，不影响文章发布 |
| AC-020 | 与原版插件 frontmatter 结构兼容 | Logic | 原版插件格式的 frontmatter | 一级属性 `title`, `slug`, `cover`, `tags`, `categories` 与原版插件完全一致 |
| AC-021 | 发布预览显示标签信息 | UI interaction | frontmatter 中包含 `tags` | 发布预览模态框中正确显示标签列表 |
| AC-022 | 发布预览显示分类信息 | UI interaction | frontmatter 中包含 `categories` | 发布预览模态框中正确显示分类列表 |
