#!/usr/bin/env bash
# Install dependencies and prepare the local environment.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Installing dependencies (root + workspaces)"
npm install

if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
fi

echo "==> Setup complete. Next: ./scripts/seed.sh && npm run dev"
