# Acceptance Criteria: 自动发布机制重新设计

**Spec:** `docs/superpowers/specs/2026-06-04-auto-publish-redesign.md`
**Date:** 2026-06-04
**Status:** Draft

---

## Criteria

### 状态机

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-001 | 文件初始状态为 IDLE | Logic | 文件在监听文件夹中，未被编辑 | 文件状态为 `IDLE` |
| AC-002 | 编辑文件后状态变为 DIRTY | Logic | 文件状态为 IDLE | 收到编辑事件后状态变为 `DIRTY` |
| AC-003 | 稳定分数达到阈值后状态变为 READY | Logic | 文件状态为 DIRTY | 稳定分数 ≥ 阈值时状态变为 `READY` |
| AC-004 | 观察窗口结束后状态变为 PUBLISHING | Logic | 文件状态为 READY，观察窗口结束，内容未变 | 状态变为 `PUBLISHING` |
| AC-005 | 发布成功后状态变为 COOLDOWN | Logic | 文件状态为 PUBLISHING，发布成功 | 状态变为 `COOLDOWN` |
| AC-006 | 冷却期结束后状态变为 IDLE | Logic | 文件状态为 COOLDOWN | 冷却期结束后状态变为 `IDLE` |
| AC-007 | 观察窗口期间内容变化时回到 DIRTY | Logic | 文件状态为 READY，观察窗口期间内容变化 | 状态回到 `DIRTY`，重置计时器 |
| AC-008 | 发布失败时不进入 COOLDOWN | Logic | 文件状态为 PUBLISHING，发布失败 | 状态保持 `DIRTY`，等待重试 |

### 事件监听

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-009 | 监听 editor-change 事件 | Logic | 文件被编辑 | Activity 分数重置为 0 |
| AC-010 | 监听 active-leaf-change 事件 | Logic | 用户切换文件 | Session 分数增加 80 |
| AC-011 | 监听 window blur 事件 | Logic | 用户切换窗口 | Session 分数增加 60 |
| AC-012 | 监听 vault.modify 事件 | Logic | 文件被保存 | Change 分数根据修改规模更新 |
| AC-013 | 监听 quit 事件 | Logic | 用户关闭 Obsidian | 触发退出时发布流程 |

### 稳定分数计算

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-014 | 最近 10 秒有输入时 Activity 分数为 0 | Logic | 最近 10 秒有编辑活动 | Activity 分数 = 0 |
| AC-015 | 最近 1 分钟无输入时 Activity 分数为 20 | Logic | 最近 1 分钟无编辑活动 | Activity 分数 = 20 |
| AC-016 | 最近 5 分钟无输入时 Activity 分数为 60 | Logic | 最近 5 分钟无编辑活动 | Activity 分数 = 60 |
| AC-017 | 文件切换时 Session 分数为 80 | Logic | 用户切换文件 | Session 分数 = 80 |
| AC-018 | 窗口失焦时 Session 分数为 60 | Logic | 用户切换窗口 | Session 分数 = 60 |
| AC-019 | 修改 < 10 字符时 Change 分数为 10 | Logic | 本轮修改 < 10 字符 | Change 分数 = 10 |
| AC-020 | 修改 10-100 字符时 Change 分数为 30 | Logic | 本轮修改 10-100 字符 | Change 分数 = 30 |
| AC-021 | 修改 > 100 字符时 Change 分数为 50 | Logic | 本轮修改 > 100 字符 | Change 分数 = 50 |
| AC-022 | 稳定分数 = Activity + Session + Change | Logic | 各维度分数已计算 | 稳定分数 = ActivityScore + SessionScore + ChangeScore |

### 发布流程

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-023 | 稳定分数达到阈值后进入观察窗口 | Logic | 稳定分数 ≥ 阈值 | 启动观察窗口定时器 |
| AC-024 | 观察窗口期间内容变化时重置 | Logic | 观察窗口期间内容变化 | 取消观察窗口，回到 DIRTY 状态 |
| AC-025 | 观察窗口结束且内容未变时发布 | Logic | 观察窗口结束，内容未变 | 计算 Hash，如果不同则发布 |
| AC-026 | Hash 相同时跳过发布 | Logic | 当前 Hash = 上次发布 Hash | 跳过发布，进入 COOLDOWN |
| AC-027 | Hash 不同时执行发布 | Logic | 当前 Hash ≠ 上次发布 Hash | 执行发布，更新上次发布 Hash |
| AC-028 | 发布成功后进入冷却期 | Logic | 发布成功 | 进入 COOLDOWN 状态，启动冷却定时器 |
| AC-029 | 冷却期结束后回到 IDLE | Logic | 冷却期结束 | 状态回到 IDLE |

### 退出时发布

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-030 | 退出时检测 dirty 文件 | Logic | 用户关闭 Obsidian，有 dirty 文件 | 检测所有 dirty 文件 |
| AC-031 | 退出时跳过观察窗口 | Logic | 退出时有 dirty 文件 | 直接发布，不等待观察窗口 |
| AC-032 | 退出时跳过冷却期 | Logic | 退出时有 dirty 文件 | 直接发布，不检查冷却期 |
| AC-033 | 退出时设置超时保护 | Logic | 退出时发布 | 30 秒超时后放弃并关闭 |

### 内容 Hash 去重

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-034 | 发布前计算内容 Hash | Logic | 准备发布 | 计算当前内容 Hash |
| AC-035 | Hash 相同时跳过发布 | Logic | 当前 Hash = 上次发布 Hash | 跳过发布 |
| AC-036 | Hash 不同时执行发布 | Logic | 当前 Hash ≠ 上次发布 Hash | 执行发布 |
| AC-037 | 发布后更新上次发布 Hash | Logic | 发布成功 | 更新上次发布 Hash |

### 配置项

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-038 | 启用/禁用自动发布 | UI interaction | 用户在设置中切换启用状态 | 自动发布功能启用/禁用 |
| AC-039 | 配置监听文件夹 | UI interaction | 用户在设置中配置文件夹 | 只监听配置的文件夹 |
| AC-040 | 配置空闲超时 | UI interaction | 用户在设置中配置空闲超时 | Activity 分数计算使用配置的超时时间 |
| AC-041 | 配置稳定分数阈值 | UI interaction | 用户在设置中配置阈值 | 使用配置的阈值判断稳定态 |
| AC-042 | 配置观察窗口时长 | UI interaction | 用户在设置中配置观察窗口 | 使用配置的观察窗口时长 |
| AC-043 | 配置冷却时间 | UI interaction | 用户在设置中配置冷却时间 | 使用配置的冷却时间 |
| AC-044 | 配置退出时发布 | UI interaction | 用户在设置中配置退出时发布 | 退出时是否发布使用配置 |
| AC-045 | 配置退出超时 | UI interaction | 用户在设置中配置退出超时 | 退出时发布使用配置的超时时间 |

### 边界情况

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-046 | 快速连续编辑时重置 Activity 计时器 | Logic | 用户快速连续编辑 | 每次编辑重置 Activity 计时器，累积 Change 分数 |
| AC-047 | 多文件同时编辑时独立状态机 | Logic | 用户同时编辑多个文件 | 每个文件有独立的状态机和分数计算 |
| AC-048 | 网络异常时保留 DIRTY 状态 | Logic | 发布时网络异常 | 状态保持 DIRTY，等待重试 |
| AC-049 | 应用崩溃后重启不重复发布 | Logic | 应用崩溃后重启 | 内容 Hash 机制避免重复发布 |
| AC-050 | 应用退出时完成发布 | Logic | 应用退出时有 dirty 文件 | 在超时内完成发布 |

### 性能

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-051 | editor-change 事件节流 | Logic | 用户快速编辑 | 事件处理被节流，不会过于频繁 |
| AC-052 | 稳定分数计算不阻塞 UI | Logic | 稳定分数计算 | 计算使用延迟任务，不阻塞 UI |
| AC-053 | 清理长时间不活跃的文件状态 | Logic | 文件长时间不活跃 | 清理该文件的状态数据 |

### 可观测性

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-054 | 状态转换时输出日志 | Logic | 状态转换 | 输出状态转换日志 |
| AC-055 | 分数计算时输出日志 | Logic | 分数计算 | 输出分数计算日志 |
| AC-056 | 发布触发时输出日志 | Logic | 发布触发 | 输出发布触发日志 |
| AC-057 | 错误发生时输出日志 | Logic | 发生错误 | 输出错误日志 |

### 与现有功能的关系

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-058 | 手动发布功能不受影响 | Logic | 自动发布启用 | 手动发布功能正常工作 |
| AC-059 | 同步管理器核心逻辑不受影响 | Logic | 自动发布启用 | 同步管理器核心逻辑正常工作 |
| AC-060 | 图片处理逻辑不受影响 | Logic | 自动发布启用 | 图片处理逻辑正常工作 |
