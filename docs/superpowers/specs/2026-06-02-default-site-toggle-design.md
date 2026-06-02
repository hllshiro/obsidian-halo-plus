# 默认站点设置交互优化

## 背景

当前"设为默认站点"开关位于添加/编辑站点的表单（`SiteModal`）中，存在两个问题：
1. 用户无法在站点列表中直观看到哪个站点是默认的
2. 没有互斥约束，多个站点可以同时被设为默认

## 目标

1. 从 `SiteModal` 表单中移除 `isDefault` 开关
2. 在站点列表中通过星标图标按钮设置默认站点
3. 保证同一时间只有一个站点为默认（互斥）
4. 发布时自动选中默认站点（已有逻辑，无需修改）

## 设计

### 数据结构

`HaloSite` 接口不变（`src/main.ts:19-24`）：
```typescript
export interface HaloSite {
  name: string;
  url: string;
  token: string;
  isDefault: boolean;
}
```

### UI 变更

#### 1. SiteModal（添加/编辑表单）

- 移除 `isDefault` toggle 控件（`settings-tab.ts:260-264`）
- 新建站点 `isDefault` 默认 `false`（保留现有逻辑）
- 编辑站点保留原有 `isDefault` 值（保留现有逻辑）

#### 2. 站点列表（renderSiteManagement）

在每个站点卡片的编辑按钮左侧添加星标按钮：

| 状态 | 图标 | 样式 |
|------|------|------|
| 非默认站点 | `lucide-star` | 灰色（`var(--text-muted)`） |
| 默认站点 | `lucide-star-filled` | 黄色（`var(--text-accent)` 或自定义） |

点击行为：
- 非默认站点点击 → 设为默认（清除其他站点的 `isDefault`）
- 默认站点点击 → 取消默认
- 立即保存并刷新列表

### 互斥逻辑

```typescript
private setAsDefault(index: number): void {
  const sites = this.plugin.getSites();
  const wasDefault = sites[index].isDefault;
  sites.forEach((site, i) => {
    site.isDefault = i === index ? !wasDefault : false;
  });
  this.plugin.saveSettings();
  this.display(); // 刷新 UI
}
```

### 发布流程

`PublishPreviewModal` 已有默认选中逻辑（`publish-preview-modal.ts:57`），无需修改：
```typescript
this.selectedSite = settings.sites.find((s) => s.isDefault) || settings.sites[0];
```

### 翻译

新增 key：
- `settings.siteManagement.setDefault`：设置为默认站点
- `settings.siteManagement.removeDefault`：取消默认站点

## 涉及文件

| 文件 | 变更 |
|------|------|
| `src/ui/settings-tab.ts` | 移除表单 toggle，列表添加星标按钮 |
| `src/i18n/en.json` | 添加翻译 key |
| `src/i18n/zh.json` | 添加翻译 key |
| `styles.css` | 可选：星标按钮样式 |
