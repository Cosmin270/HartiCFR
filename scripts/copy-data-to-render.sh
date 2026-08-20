#!/usr/bin/env bash
# Copies reference data (stations, level-crossing logs) from the local
# development database into a deployed one. The schema is created by EF
# migrations when the API boots, so only table contents move here.
#
# Usage:
#   scripts/copy-data-to-render.sh 'postgresql://user:pass@host/db'
#
# Get the URL from the Render dashboard: harticfr-db -> "External Database URL".
# Users are deliberately not copied -- register fresh accounts on the deployment.

set -euo pipefail

TARGET_URL=${1:-}
if [ -z "$TARGET_URL" ]; then
    echo "usage: $0 <target-database-url>" >&2
    exit 1
fi

LOCAL_CONTAINER=${LOCAL_CONTAINER:-harticfr-db}
LOCAL_DB=${LOCAL_DB:-harticfr}
LOCAL_USER=${LOCAL_USER:-postgres}

dump=$(mktemp)
trap 'rm -f "$dump"' EXIT

echo "Dumping Stations and Logs from local container '$LOCAL_CONTAINER'..."
docker exec "$LOCAL_CONTAINER" pg_dump \
    -U "$LOCAL_USER" -d "$LOCAL_DB" \
    --data-only --no-owner --no-privileges \
    -t '"Stations"' -t '"Logs"' > "$dump"

echo "Restoring into target database..."
psql "$TARGET_URL" -v ON_ERROR_STOP=1 -f "$dump"

echo "Done. Row counts on target:"
psql "$TARGET_URL" -c 'select (select count(*) from "Stations") as stations, (select count(*) from "Logs") as logs;'
