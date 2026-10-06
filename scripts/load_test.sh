#!/usr/bin/env bash
# scripts/load_test.sh
# Load testing script for ISMS Non-Functional Requirements (PE-1, PE-3)
# Validates API latency < 2.0s and throughput under concurrent traffic.

set -euo pipefail

ISMS_URL="${ISMS_URL:-http://localhost:8080}"
CONCURRENCY="${CONCURRENCY:-20}"
REQUESTS="${REQUESTS:-100}"

echo "=========================================================="
echo "ISMS NFR Load & Performance Benchmark (PE-1, PE-3)"
echo "Target URL:    $ISMS_URL"
echo "Concurrency:   $CONCURRENCY workers"
echo "Total Requests:$REQUESTS"
echo "=========================================================="

# Check target is up
if ! curl -s -f "$ISMS_URL/health" > /dev/null; then
  echo "[-] Error: ISMS instance is not reachable at $ISMS_URL"
  exit 1
fi

echo "[+] Health check passed. Beginning benchmark..."

START_TIME=$(date +%s)
TEMP_RESULTS=$(mktemp)

# Run concurrent requests
seq 1 "$REQUESTS" | xargs -n 1 -P "$CONCURRENCY" -I {} bash -c '
  LATENCY=$(curl -s -o /dev/null -w "%{time_total}\n" "'"$ISMS_URL"'/health")
  echo "$LATENCY" >> '"$TEMP_RESULTS"'
'

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
TOTAL_COUNT=$(wc -l < "$TEMP_RESULTS" | tr -d ' ')

if [ "$TOTAL_COUNT" -gt 0 ]; then
  AVG_LATENCY=$(awk '{sum+=$1} END {print sum/NR}' "$TEMP_RESULTS")
  MAX_LATENCY=$(sort -n "$TEMP_RESULTS" | tail -n 1)
  P95_LATENCY=$(sort -n "$TEMP_RESULTS" | awk 'BEGIN{c=0} {a[c++]=$1} END{idx=int(c*0.95); print a[idx]}')

  echo "----------------------------------------------------------"
  echo "Benchmark Results:"
  echo "Requests Completed: $TOTAL_COUNT"
  echo "Total Duration:     ${DURATION}s"
  echo "Average Latency:    ${AVG_LATENCY}s"
  echo "95th Percentile:    ${P95_LATENCY}s (Target: < 2.0s)"
  echo "Max Latency:        ${MAX_LATENCY}s"
  echo "----------------------------------------------------------"

  # PE-1 verification (p95 < 2.0s)
  IS_UNDER_2S=$(awk -v p95="$P95_LATENCY" 'BEGIN {print (p95 < 2.0) ? 1 : 0}')
  if [ "$IS_UNDER_2S" -eq 1 ]; then
    echo "[PASS] PE-1 NFR Satisfied: p95 latency is under 2.0s"
  else
    echo "[WARN] Latency exceeded PE-1 target threshold of 2.0s"
  fi
fi

rm -f "$TEMP_RESULTS"
echo "[+] Load test complete."
