#!/usr/bin/env bash
# Seed synthetic data into the datastore.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Seeding synthetic data"
node data/seed.mjs
