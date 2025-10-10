# Hyper Context

智能化的提示词管理和上下文工程平台

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker >= 20.10.0 (可选)

### 安装和启动

```bash
# 1. 克隆项目
git clone <repository-url>
cd hyper-context

# 2. 运行初始化脚本
chmod +x scripts/init.sh
./scripts/init.sh

# 3. 启动开发环境
chmod +x scripts/dev.sh
./scripts/dev.sh
```

### 项目结构

```
hyper-context/
├── packages/
│   ├── frontend/          # Vue3 前端应用
│   ├── backend/           # Next.js 后端服务
│   └── shared/            # 共享类型和工具
├── scripts/               # 构建和部署脚本
├── database/              # SQLite 数据库文件
└── docs/                  # 项目文档
```

### 常用命令

```bash
# 开发
pnpm dev                   # 启动开发服务器
pnpm build                 # 构建项目
pnpm lint                  # 代码检查
pnpm format                # 格式化代码

# 数据库
pnpm db:generate           # 生成 Prisma 客户端
pnpm db:push               # 同步数据库结构
pnpm db:migrate            # 运行数据库迁移
pnpm db:seed               # 填充种子数据

# Docker
pnpm docker:build          # 构建 Docker 镜像
pnpm docker:up             # 启动 Docker 服务
pnpm docker:down           # 停止 Docker 服务
```

### 访问地址

- 前端: http://localhost:3000
- 后端: http://localhost:3001

### 核心功能

- ✅ 提示词项目管理
- ✅ 版本控制和稳定版标记
- ✅ 结构化知识编辑
- ✅ MCP 接口集成
- ✅ 知识树结构管理
- ✅ 双层提示词架构

### 技术栈

- **前端**: Vue 3 + Vite + TypeScript + Tailwind CSS
- **后端**: Next.js 14 + Prisma + SQLite
- **工具链**: pnpm + Docker + ESLint + Prettier

## 详细文档

- [项目需求](./REQUIRE.md)
- [项目初始化](./项目初始化.md)
- [前端页面设计](./前端页面设计.md)
- [后端接口设计](./后端接口+数据库设计.md)

## 许可证

MIT