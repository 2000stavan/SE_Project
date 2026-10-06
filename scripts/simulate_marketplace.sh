#!/usr/bin/env bash
# simulate_marketplace.sh
# Sends an HMAC-SHA256 signed marketplace webhook to ISMS

set -euo pipefail

MARKETPLACE="${1:-amazon}"
EVENT="${2:-order-created}"
SECRET="${MARKETPLACE_SECRET:-secret1}"
URL="${ISMS_URL:-http://localhost:8080/api/v1/sales/webhook}/${MARKETPLACE}"

ORDER_ID="MKT-$(date +%s)"
PAYLOAD=$(cat <<EOF
{
  "order_id": "${ORDER_ID}",
  "event": "${EVENT}",
  "customer_info": "Simulated Marketplace Customer",
  "items": [
    {
      "sku_id": "SKU-1001",
      "quantity": 2,
      "unit_price": 49.99,
      "location_id": "WH-01"
    }
  ],
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
)

# Compute HMAC-SHA256 signature
SIG=$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')

echo "==> Sending ${EVENT} webhook to ${URL}"
echo "Payload: ${PAYLOAD}"
echo "Signature: ${SIG}"

curl -i -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Signature: ${SIG}" \
  -d "$PAYLOAD"

echo ""
