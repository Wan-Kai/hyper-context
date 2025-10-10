#!/bin/bash

echo "🚀 开始初始化 Hyper Context 项目..."

# 检查环境要求
echo "📋 检查环境要求..."
node_version=$(node --version | cut -d'v' -f2)
pnpm_version=$(pnpm --version)

echo "Node.js 版本: $node_version"
echo "pnpm 版本: $pnpm_version"

# 检查版本要求
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装，请先安装 pnpm"
    echo "安装命令: npm install -g pnpm"
    exit 1
fi

# 安装依赖
echo "📦 安装项目依赖..."
pnpm install

# 创建共享包基础文件
echo "🔧 创建共享包基础文件..."
if [ ! -f "packages/shared/src/types.ts" ]; then
    mkdir -p packages/shared/src
    cat > packages/shared/src/types.ts << 'EOF'
// 通用类型定义
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp: string
}

export interface Project {
  id: string
  name: string
  description: string
  knowledgeCount: number
  stableVersion: string | null
  mcpStatus: 'active' | 'inactive' | 'error'
  createdAt: string
  updatedAt: string
}

export interface Knowledge {
  id: string
  name: string
  level: 'core' | 'non-core'
  description: string
  content: string
  parentId: string | null
  extends: ExtendBlock[]
  createdAt: string
  updatedAt: string
}

export interface ExtendBlock {
  name: string
  level: 'core' | 'non-core'
  description: string
  content: string
}

export interface Version {
  id: string
  version: string
  isStable: boolean
  author: string
  changes: string[]
  createdAt: string
}
EOF

    cat > packages/shared/src/index.ts << 'EOF'
export * from './types'
EOF
fi

# 构建共享包
echo "🔨 构建共享包..."
pnpm --filter @hyper-context/shared build

# 创建前端基础文件
echo "🎨 创建前端基础文件..."
mkdir -p packages/frontend/src/{components,views,stores,api,utils,styles}

if [ ! -f "packages/frontend/src/main.ts" ]; then
    cat > packages/frontend/src/main.ts << 'EOF'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
EOF
fi

if [ ! -f "packages/frontend/src/App.vue" ]; then
    cat > packages/frontend/src/App.vue << 'EOF'
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
// App 根组件
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
EOF
fi

if [ ! -f "packages/frontend/src/styles/main.css" ]; then
    cat > packages/frontend/src/styles/main.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 自定义样式 */
.project-card {
  @apply bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-all duration-200 cursor-pointer;
}

.knowledge-badge {
  @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium;
}

.knowledge-badge--core {
  @apply bg-purple-100 text-purple-800;
}

.knowledge-badge--non-core {
  @apply bg-gray-100 text-gray-800;
}
EOF
fi

# 创建后端基础文件
echo "🔧 创建后端基础文件..."
mkdir -p packages/backend/src/app/{api,components}
mkdir -p packages/backend/prisma

if [ ! -f "packages/backend/src/app/page.tsx" ]; then
    cat > packages/backend/src/app/page.tsx << 'EOF'
export default function Home() {
  return (
    <main>
      <h1>Hyper Context Backend</h1>
      <p>API Server is running on port 3001</p>
    </main>
  )
}
EOF
fi

if [ ! -f "packages/backend/src/app/layout.tsx" ]; then
    cat > packages/backend/src/app/layout.tsx << 'EOF'
export const metadata = {
  title: 'Hyper Context Backend',
  description: '智能化的提示词管理和上下文工程平台 - 后端服务',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
EOF
fi

echo "✅ 项目初始化完成！"
echo ""
echo "📋 下一步操作："
echo "1. 运行 'pnpm dev' 启动开发服务器"
echo "2. 运行 'pnpm db:generate' 生成数据库客户端（当添加 Prisma schema 后）"
echo "3. 运行 'pnpm db:push' 同步数据库结构"
echo "4. 访问 http://localhost:3000 查看前端"
echo "5. 访问 http://localhost:3001 查看后端 API"