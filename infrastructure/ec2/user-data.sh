#!/usr/bin/env bash
# EC2 user-data bootstrap for Transfer-Ready (Amazon Linux 2023).
set -euo pipefail

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs git

# Clone and build
APP_DIR=/opt/transfer-ready
git clone https://example.com/your-org/transfer-ready.git "$APP_DIR" || true
cd "$APP_DIR"
npm install
npm run build

# Start backend (consider a systemd unit or pm2 for production)
nohup npm run start --workspace=backend > /var/log/transfer-ready.log 2>&1 &
