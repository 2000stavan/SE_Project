#!/usr/bin/env bash
# End-to-end API smoke test against a running ISMS backend (demo profile).
# Usage: scripts/smoke_test.sh [base_url]     default http://localhost:8080/api/v1
# Exercises login for all 4 roles, CRUD on products/suppliers/POs/sales/users, RBAC denials,
# audit log, notification preferences and forecast accuracy. Exits non-zero on any failure.
set -u
B="${1:-http://localhost:8080/api/v1}"
PASS=0; FAIL=0
J='Content-Type: application/json'

tok() { curl -s -X POST "$B/auth/login" -H "$J" -d "{\"user_id\":\"$1\",\"password\":\"Password123!\"}" | python -c "import sys,json; print(json.load(sys.stdin).get('token',''))"; }
# req METHOD PATH TOKEN [BODY]  → prints "<status> <body>"
req() {
  local m="$1" p="$2" t="$3" d="${4:-}"
  if [ -n "$d" ]; then curl -s -w ' %{http_code}' -X "$m" "$B$p" -H "$J" -H "Authorization: Bearer $t" -d "$d"
  else curl -s -w ' %{http_code}' -X "$m" "$B$p" -H "$J" -H "Authorization: Bearer $t"; fi
}
code() { echo "${1##* }"; }
body() { echo "${1% *}"; }
check() { # name expected_code actual_response
  if [ "$(code "$3")" = "$2" ]; then PASS=$((PASS+1)); echo "  ok   $1"; else FAIL=$((FAIL+1)); echo "  FAIL $1 (expected $2, got $(code "$3")): $(body "$3" | head -c 200)"; fi
}
jget() { python -c "import sys,json; d=json.loads(sys.argv[1]); print(eval('d'+sys.argv[2]))" "$1" "$2"; }

A=$(tok USR-ADMIN-1); M=$(tok USR-MGR-1); W=$(tok USR-WH-1); S=$(tok USR-SALES-1)
[ -n "$A" ] && [ -n "$M" ] && [ -n "$W" ] && [ -n "$S" ] || { echo "login failed for a seeded role"; exit 1; }
echo "Auth"; check "bad password rejected" 401 "$(curl -s -w ' %{http_code}' -X POST "$B/auth/login" -H "$J" -d '{"user_id":"USR-ADMIN-1","password":"nope"}')"
check "password-reset request is generic 200" 200 "$(curl -s -w ' %{http_code}' -X POST "$B/auth/password-reset/request" -H "$J" -d '{"email":"nobody@example.com"}')"

echo "Inventory CRUD"
SKU="SMOKE-$RANDOM"
r=$(req POST /products "$M" "{\"sku_id\":\"$SKU\",\"name\":\"Smoke Widget\",\"category\":\"Test\",\"unit_of_measure\":\"PCS\",\"unit_price\":9.5,\"reorder_point\":5}"); check "create product" 201 "$r"
check "duplicate SKU -> 409" 409 "$(req POST /products "$M" "{\"sku_id\":\"$SKU\",\"name\":\"dup\",\"category\":\"T\",\"unit_of_measure\":\"PCS\",\"unit_price\":1,\"reorder_point\":1}")"
check "search products" 200 "$(req GET "/products?q=Smoke" "$W")"
check "update product" 200 "$(req PATCH /products/$SKU "$M" '{"name":"Smoke Widget v2","unit_price":10.5}')"
check "stock update (PUT)" 200 "$(req PUT "/stock/$SKU/WH-01" "$W" '{"quantity_on_hand":30}')"
check "negative stock rejected -> 400" 400 "$(req PUT "/stock/$SKU/WH-01" "$W" '{"quantity_on_hand":-1}')"
check "invalid product body -> 400 (not 500)" 400 "$(req POST /products "$M" '{"name":"no sku"}')"
check "delete blocked while stock>0 -> 409" 409 "$(req DELETE /products/$SKU "$M")"
check "sales cannot create product -> 403" 403 "$(req POST /products "$S" '{"sku_id":"X","name":"x","category":"T","unit_of_measure":"PCS","unit_price":1,"reorder_point":1}')"

echo "Suppliers & purchase orders"
newsup=$(req POST /suppliers "$A" '{"name":"Smoke Supplies","contactDetails":"smoke@example.com","leadTime":5}'); check "admin creates supplier" 201 "$newsup"
sups=$(req GET /suppliers "$M"); check "list suppliers" 200 "$sups"
SUP=$(jget "$(body "$newsup")" "['supplierId']")   # a fresh supplier: independent of credit used by earlier data (BR-2)
check "supplier history" 200 "$(req GET /suppliers/$SUP/history "$M")"
po=$(req POST /purchase-orders "$M" "{\"supplier_id\":\"$SUP\",\"expected_date\":\"2027-01-01\",\"lines\":[{\"sku_id\":\"$SKU\",\"quantity\":10}]}"); check "create PO (draft)" 201 "$po"
PO=$(jget "$(body "$po")" "['poId']")
echo "       PO id: $PO"
check "warehouse cannot create PO -> 403" 403 "$(req POST /purchase-orders "$W" "{\"supplier_id\":\"$SUP\",\"expected_date\":\"2027-01-01\",\"lines\":[{\"sku_id\":\"$SKU\",\"quantity\":1}]}")"
check "submit PO" 200 "$(req POST /purchase-orders/$PO/submit "$M")"
check "reject PO with reason" 200 "$(req POST /purchase-orders/$PO/reject "$M" '{"reason":"smoke reject"}')"
check "re-submit PO" 200 "$(req POST /purchase-orders/$PO/submit "$M")"
check "approve PO" 200 "$(req POST /purchase-orders/$PO/approve "$M")"
check "list POs" 200 "$(req GET /purchase-orders "$M")"
check "get PO detail" 200 "$(req GET /purchase-orders/$PO "$W")"
check "receive PO (stock +)" 200 "$(req POST /purchase-orders/$PO/receive "$W" "{\"lines\":[{\"sku_id\":\"$SKU\",\"quantity_received\":10,\"location_id\":\"WH-01\"}]}")"
check "overdue POs" 200 "$(req GET /purchase-orders/overdue "$M")"

echo "Sales"
sale=$(req POST /sales/physical "$S" "{\"payment_method\":\"Cash\",\"lines\":[{\"sku_id\":\"$SKU\",\"quantity\":2}]}"); check "physical sale" 201 "$sale"
check "oversell rejected -> 409" 409 "$(req POST /sales/physical "$S" "{\"payment_method\":\"Cash\",\"lines\":[{\"sku_id\":\"$SKU\",\"quantity\":99999}]}")"
check "list sales" 200 "$(req GET /sales "$S")"
check "warehouse cannot view sales -> 403" 403 "$(req GET /sales "$W")"

SO=$(jget "$(body "$sale")" "['order_id']" 2>/dev/null || true)
[ -n "$SO" ] && check "return order restocks" 200 "$(req POST /sales/$SO/return "$S")"
sim=$(curl -s -w ' %{http_code}' -X POST "$B/sales/dev/simulate-marketplace-order?marketplace=amazon" -H "$J" -d "{\"order_id\":\"SIM-$RANDOM\",\"event\":\"order-paid\",\"customer_info\":\"smoke\",\"lines\":[{\"sku_id\":\"$SKU\",\"quantity\":1,\"location_id\":\"WH-01\",\"unit_price\":10}]}")
check "marketplace simulator (HMAC webhook)" 200 "$sim"

echo "Users, audit, notifications, forecast"
NU="smoke-$RANDOM"
check "admin creates user" 200 "$(req POST /users "$A" "{\"user_id\":\"$NU\",\"name\":\"Smoke User\",\"email\":\"$NU@example.com\",\"role\":\"Sales Personnel\",\"password\":\"Password123!\"}")"
check "admin changes role" 200 "$(req PATCH /users/$NU/role "$A" '{"role":"Manager"}')"
check "admin deactivates user" 200 "$(req PATCH /users/$NU/status "$A" '{"status":"inactive"}')"
check "admin lists users" 200 "$(req GET /users "$A")"
check "manager cannot list users -> 403" 403 "$(req GET /users "$M")"
check "admin audit log" 200 "$(req GET /admin/audit-log "$A")"
check "manager audit log -> 403" 403 "$(req GET /admin/audit-log "$M")"
check "low-stock update (stock 2 < reorder point 5)" 200 "$(req PUT "/stock/$SKU/WH-01" "$M" '{"quantity_on_hand":2}')"
nl=$(req GET /notifications "$M"); check "notifications inbox with data (manager)" 200 "$nl"
[ "$(python -c "import sys,json; print(len(json.loads(sys.argv[1])))" "$(body "$nl")")" -gt 0 ] && { PASS=$((PASS+1)); echo "  ok   low-stock alert was created"; } || { FAIL=$((FAIL+1)); echo "  FAIL no low-stock alert in inbox"; }
check "notifications inbox" 200 "$(req GET /notifications "$W")"
prefs=$(req GET /notifications/preferences "$W"); check "get preferences" 200 "$prefs"
check "save preferences" 200 "$(req PUT /notifications/preferences "$W" "{\"preferences\":$(body "$prefs")}")"
check "forecast list" 200 "$(req GET /forecast "$M")"
check "reorder suggestions" 200 "$(req GET /forecast/reorder-suggestions "$M")"
check "forecast accuracy" 200 "$(req GET /forecast/accuracy "$M")"
check "revenue analytics" 200 "$(req GET "/analytics/revenue?group_by=channel" "$M")"
check "stock list (all roles)" 200 "$(req GET /stock "$S")"
check "settings (admin)" 200 "$(req GET /settings "$A")"
check "supplier performance" 200 "$(req GET /suppliers/$SUP/performance "$M")"
check "product by sku" 200 "$(req GET /products/$SKU "$S")"
check "stock analytics" 200 "$(req GET /analytics/stock "$W")"
check "unauthenticated -> 401" 401 "$(curl -s -w ' %{http_code}' "$B/products")"
check "garbage token -> 401" 401 "$(req GET /products "not-a-jwt")"

echo; echo "Result: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
