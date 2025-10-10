#!/bin/bash

echo "🚀 启动开发环境..."

# 检查是否已初始化
if [ ! -d "node_modules" ]; then
  echo "❌ 项目未初始化，请先运行 pnpm install"
  exit 1
fi

# 检查共享包是否已构建
if [ ! -d "packages/shared/dist" ]; then
  echo "🔨 构建共享包..."
  pnpm --filter @hyper-context/shared build
fi

# 启动数据库（如果需要）
echo "🗄️ 检查数据库状态..."
if [ ! -f "database/dev.db" ]; then
  echo "📊 初始化数据库..."
  if [ -f "packages/backend/prisma/schema.prisma" ]; then
    pnpm db:generate
    pnpm db:push
    if [ -f "packages/backend/prisma/seed.ts" ]; then
      pnpm db:seed
    fi
  else
    echo "⚠️ Prisma schema 文件不存在，跳过数据库初始化"
  fi
fi

# 并行启动前端和后端
echo "🎯 启动开发服务器..."
echo "前端: http://localhost:3000"
echo "后端: http://localhost:3001"
echo ""
echo "按 Ctrl+C 停止服务器"

pnpm dev