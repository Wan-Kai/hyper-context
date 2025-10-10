#!/bin/bash

echo "🐳 构建 Docker 镜像..."

# 检查 Docker 是否可用
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装或未启动"
    exit 1
fi

# 构建项目
echo "🏗️ 构建项目..."
./scripts/build.sh

# 构建 Docker 镜像
echo "🐳 构建 Docker 镜像..."
docker-compose build

echo "✅ Docker 镜像构建完成！"
echo ""
echo "启动服务: docker-compose up -d"
echo "停止服务: docker-compose down"