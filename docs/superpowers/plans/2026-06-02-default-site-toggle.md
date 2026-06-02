# 默认站点星标切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** 将"设为默认站点"从添加/编辑表单移到站点列表中，使用星标图标按钮实现互斥切换。

**Architecture:** 修改 `settings-tab.ts` 的 `renderSiteManagement()` 和 `SiteModal`，添加翻译 key，可选添加 CSS 样式。

**Tech Stack:** TypeScript, Obsidian API (`Setting`, `setIcon`), CSS

---

### Task 1: 添加翻译 key

**Files:**
- Modify: `src/i18n/en.json:12-13`
- Modify: `src/i18n/zh.json:12-13`

- [ ] **Step 1: 更新英文翻译**

在 `en.json` 的 `siteManagement` 对象中，将 `"defaultSite": "Default Site"` 替换为两个新 key：

```json
"setDefault": "Set as default site",
"removeDefault": "Remove default"
```

- [ ] **Step 2: 更新中文翻译**

在 `zh.json` 的 `siteManagement` 对象中，将 `"defaultSite": "默认站点"` 替换为两个新 key：

```json
"setDefault": "设为默认站点",
"removeDefault": "取消默认"
```

---

### Task 2: 从 SiteModal 移除 isDefault 开关

**Files:**
- Modify: `src/ui/settings-tab.ts:260-264`

- [ ] **Step 1: 删除 isDefault toggle**

删除 `SiteModal.onOpen()` 中的以下代码块（第 260-264 行）：

```typescript
new Setting(contentEl).setName(t('settings.siteManagement.defaultSite')).addToggle((toggle) =>
  toggle.setValue(this.data.isDefault).onChange((value) => {
    this.data.isDefault = value;
  }),
);
```

---

### Task 3: 在站点列表添加星标按钮

**Files:**
- Modify: `src/ui/settings-tab.ts:41-65`

- [ ] **Step 1: 添加 setAsDefault 方法**

在 `SettingsTab` 类中（`editSite` 方法之后），添加：

```typescript
private async setAsDefault(index: number): Promise<void> {
  const sites = this.plugin.getSites();
  const wasDefault = sites[index].isDefault;
  sites.forEach((site, i) => {
    site.isDefault = i === index ? !wasDefault : false;
  });
  await this.plugin.saveSettings();
  this.display();
}
```

- [ ] **Step 2: 在站点卡片中添加星标按钮**

修改 `renderSiteManagement()` 中的站点渲染逻辑，在编辑按钮之前添加星标按钮：

```typescript
sites.forEach((site, index) => {
  const siteEl = containerEl.createDiv({ cls: 'halo-site-setting' });

  new Setting(siteEl)
    .setName(site.name)
    .setDesc(site.url)
    .addButton((btn) =>
      btn
        .setIcon(site.isDefault ? 'star' : 'star-off')
        .setTooltip(
          site.isDefault
            ? t('settings.siteManagement.removeDefault')
            : t('settings.siteManagement.setDefault'),
        )
        .onClick(() => {
          this.setAsDefault(index);
        }),
    )
    .addButton((btn) =>
      btn
        .setButtonText(t('settings.siteManagement.editSite'))
        .setCta()
        .onClick(() => {
          this.editSite(index);
        }),
    )
    .addButton((btn) =>
      btn
        .setButtonText(t('settings.siteManagement.deleteSite'))
        .setWarning()
        .onClick(async () => {
          this.plugin.settings.sites.splice(index, 1);
          await this.plugin.saveSettings();
          this.display();
        }),
    );
});
```

---

### Task 4: 添加星标按钮样式（可选）

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: 添加星标按钮高亮样式**

在 `.halo-site-setting` 样式块之后添加：

```css
.halo-site-setting .clickable-icon {
  color: var(--text-muted);
}

.halo-site-setting .clickable-icon.star-active {
  color: var(--text-accent);
}
```

> 注意：Obsidian 的 `setIcon('star')` 使用内置 lucide 图标，样式通过 `button-element` 的 class 控制。如果 Obsidian 原生样式已足够区分，此步骤可跳过。

---

### Task 5: 验证与提交

- [ ] **Step 1: 运行 lint**

```bash
pnpm lint
```

Expected: 无错误

- [ ] **Step 2: 运行构建**

```bash
pnpm build
```

Expected: 构建成功

- [ ] **Step 3: 提交**

```bash
git add src/ui/settings-tab.ts src/i18n/en.json src/i18n/zh.json styles.css
git commit -m "feat: move default site toggle to site list with star icon"
```
