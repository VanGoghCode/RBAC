#!/bin/bash
# Benchmark: Task list API response time
# Usage: pnpm exec tsx scripts/bench-tasks.sh
# Requires running API server with seeded data.

set -euo pipefail

BASE_URL="${API_URL:-http://localhost:3000}"
ITERATIONS=10

echo "=== Task List Benchmark ==="
echo "Target: < 300ms locally for seeded data"
echo "URL: $BASE_URL/api/tasks"
echo "Iterations: $ITERATIONS"
echo ""

# Login to get token
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@acme.com","password":"password123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | node -e "const d=[];process.stdin.on('data',c=>d.push(c));process.stdin.on('end',()=>console.log(JSON.parse(Buffer.concat(d)).accessToken||''))")

if [ -z "$TOKEN" ] || [ "$TOKEN" = "undefined" ]; then
  echo "ERROR: Could not get auth token. Is the API running and seeded?"
  exit 1
fi

TOTAL_MS=0
MIN_MS=999999
MAX_MS=0

for i in $(seq 1 $ITERATIONS); do
  START=$(date +%s%N)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/tasks?orgId=org-acme&limit=20")
  END=$(date +%s%N)

  ELAPSED=$(( (END - START) / 1000000 ))

  if [ "$HTTP_CODE" != "200" ]; then
    echo "  [$i] HTTP $HTTP_CODE - skipping"
    continue
  fi

  TOTAL_MS=$((TOTAL_MS + ELAPSED))
  if [ "$ELAPSED" -lt "$MIN_MS" ]; then MIN_MS=$ELAPSED; fi
  if [ "$ELAPSED" -gt "$MAX_MS" ]; then MAX_MS=$ELAPSED; fi

  echo "  [$i] ${ELAPSED}ms"
done

AVG_MS=$((TOTAL_MS / ITERATIONS))
echo ""
echo "Results:"
echo "  Average: ${AVG_MS}ms"
echo "  Min: ${MIN_MS}ms"
echo "  Max: ${MAX_MS}ms"
echo ""
if [ "$AVG_MS" -lt 300 ]; then
  echo "PASS: Average under 300ms target"
else
  echo "WARN: Average exceeds 300ms target"
fi
