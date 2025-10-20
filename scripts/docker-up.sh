#!/usr/bin/env bash
set -euo pipefail

echo "🚀 一键启动 Hyper Context (Docker)"

# Check Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ 未检测到 Docker，请先安装并启动 Docker Desktop"
  exit 1
fi

# Select Docker Compose command (v2 `docker compose` preferred)
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "❌ 未检测到 Docker Compose"
  exit 1
fi

echo "🐳 使用: ${COMPOSE[*]}"

# Ensure database folder exists for volume mount
mkdir -p "$(dirname "$0")/../database" >/dev/null 2>&1 || true

echo "🏗️ 构建镜像..."
"${COMPOSE[@]}" build

echo "📦 启动容器 (detached)..."
"${COMPOSE[@]}" up -d

echo "💡 访问入口"
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:3001/api/health"
echo "  数据库: ./database/hyper-context.db (SQLite 文件)"

echo "🛰️ 跟随服务日志 (Ctrl+C 退出，容器保持运行)"
"${COMPOSE[@]}" logs -f --tail=100

