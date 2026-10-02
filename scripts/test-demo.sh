#!/usr/bin/env bash
# Smoke-test the running backend for a demo.
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:3001}

echo "==> Health check"
curl -fsS "$BASE_URL/api/health" && echo

echo "==> List transfers"
curl -fsS "$BASE_URL/api/transfers" && echo

echo "==> Done"
