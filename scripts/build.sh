#!/bin/bash

echo "🏗️ 构建项目..."

# 构建共享包
echo "🔨 构建共享包..."
pnpm --filter @hyper-context/shared build

# 生成数据库客户端
if [ -f "packages/backend/prisma/schema.prisma" ]; then
  echo "📊 生成数据库客户端..."
  pnpm db:generate
fi

# 构建所有包
echo "🎯 构建所有包..."
pnpm build

echo "✅ 构建完成！"