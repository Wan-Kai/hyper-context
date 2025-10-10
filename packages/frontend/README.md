@hyper-context/frontend

Vue 3 + Vite + TypeScript 前端应用。

开发

```
pnpm --filter @hyper-context/frontend dev
```

- 默认启用本地 Mock（vite-plugin-mock）。
- Mock 路由从 `packages/frontend/mock/` 自动加载，支持热更新与 TS。

如需关闭 Mock，改为直连后端：
- 临时关闭（一次会话）：
  ```bash
  VITE_USE_MOCK=false pnpm --filter @hyper-context/frontend dev
  ```
- 或编辑 `packages/frontend/vite.config.ts`，将 `localEnabled` 逻辑改为 `false` 或按需调整（关闭后会自动将 `/api` 代理到 `http://localhost:3001`）。

Mock 规范

- 路由文件：`packages/frontend/mock/*.ts`
- 每个文件导出 `MockMethod[]`
- 支持 REST 动态路由：例如 `/api/projects/:id`
- 示例：`packages/frontend/mock/project.ts`

构建

```
pnpm --filter @hyper-context/frontend build
```

生产环境不会启用 Mock。

目录

- `src/` 源码
- `mock/` 本地接口 Mock（仅开发态）
- `vite.config.ts` Vite 配置（已集成 vite-plugin-mock）
