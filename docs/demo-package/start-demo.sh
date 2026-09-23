#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "Starting demo at http://localhost:${PORT:-8443}"
echo "Guest entry: http://localhost:${PORT:-8443}/#/m/7"
node --experimental-strip-types server/index.ts
