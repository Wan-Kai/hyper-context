#!/usr/bin/env bash
set -euo pipefail

echo "🛑 停止并移除 Hyper Context (Docker) 容器"

# Choose Docker Compose command
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "❌ 未检测到 Docker Compose"
  exit 1
fi

# Forward common flags if provided
# -v/--volumes: remove anonymous volumes
# --rmi local|all: remove images (use with caution)
EXTRA_ARGS=("$@")

echo "🐳 使用: ${COMPOSE[*]} down ${EXTRA_ARGS[*]}"
"${COMPOSE[@]}" down "${EXTRA_ARGS[@]}"

echo "✅ 已停止并移除相关容器"

