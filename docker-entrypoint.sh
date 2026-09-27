#!/bin/sh
set -e

# Apply pending migrations. Set SKIP_MIGRATIONS=1 to turn this off.
if [ "$SKIP_MIGRATIONS" != "1" ]; then
  echo "Running database migrations…"
  (cd /migrate && node node_modules/prisma/build/index.js migrate deploy)
fi

exec node /app/server.js
