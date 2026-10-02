#!/usr/bin/env bash
# Pull latest, rebuild, and restart Transfer-Ready services on the instance.
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/transfer-ready}
cd "$APP_DIR"

echo "==> Pulling latest"
git pull --ff-only

echo "==> Installing dependencies"
npm install

echo "==> Building"
npm run build

echo "==> Restarting backend"
pkill -f "node dist/app.js" || true
nohup npm run start --workspace=backend > /var/log/transfer-ready.log 2>&1 &

echo "==> Done"
