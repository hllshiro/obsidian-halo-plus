# Reference

本地开发参考资料，git-ignored。

## Contents

- **halo-restful-api/**: Halo 官方全部 RESTful API 文档（OpenAPI JSON），包含：
  - `apis_console.api_v1alpha1.json` — Console API（管理端，需认证）
  - `apis_uc.api_v1alpha1.json` — UC API（用户中心，需认证）
  - `apis_public.api_v1alpha1.json` — Public API（公开访问）
  - `apis_extension.api_v1alpha1.json` — Extension API（扩展/CRD）
  - `aggregated-DiIzbgLR.json` — 聚合文档（全部 API 合集）
  
  结合 `@halo-dev/api-client` 的 `README.md` 和 `index.d.ts` 分析，可确定具体 API 的调用方式。项目中使用的 `client.consoleApi`、`client.coreApi`、`client.publicApi` 对应上述三类 API。

- **obsidian-halo-official**: Halo 官方 Obsidian 插件（halo-sigs），参考其：
  - Halo API 调用方式和认证机制
  - 文章发布/更新流程
  - 附件上传处理
  - Frontmatter 数据结构设计
  - repository: https://github.com/halo-sigs/obsidian-halo
