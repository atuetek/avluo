#!/usr/bin/env bash
# MVP smoke against running API (local or prod with AUTH).
set -euo pipefail

API="${API_URL:-http://localhost:3000}"
TENANT="${TENANT_SLUG:-yesiltepe}"
PHONE="${PHONE:-+905551234567}"

hdr=(-H "x-dev-tenant: $TENANT" -H "Content-Type: application/json")

echo "==> Health live"
curl -fsS "$API/health/live" | tee /tmp/avluo-live.json
echo

echo "==> Health ready"
curl -fsS "$API/health/ready" | tee /tmp/avluo-ready.json
echo

echo "==> Send OTP"
OTP_JSON=$(curl -fsS -X POST "$API/api/auth/send-otp" "${hdr[@]}" -d "{\"phone\":\"$PHONE\"}")
echo "$OTP_JSON"
OTP=$(echo "$OTP_JSON" | sed -n 's/.*"debugOtp":"\([^"]*\)".*/\1/p')
if [[ -z "$OTP" ]]; then
  echo "No debugOtp — set OTP env or check SMS provider"
  OTP="${OTP_CODE:-}"
fi
[[ -n "$OTP" ]] || { echo "Missing OTP"; exit 1; }

echo "==> Verify OTP"
AUTH=$(curl -fsS -X POST "$API/api/auth/verify-otp" "${hdr[@]}" -d "{\"phone\":\"$PHONE\",\"code\":\"$OTP\"}")
TOKEN=$(echo "$AUTH" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[[ -n "$TOKEN" ]] || { echo "No token"; echo "$AUTH"; exit 1; }
auth=(-H "Authorization: Bearer $TOKEN" -H "x-dev-tenant: $TENANT" -H "Content-Type: application/json")

echo "==> Members me"
curl -fsS "$API/api/members/me" "${auth[@]}" | head -c 200
echo

echo "==> Create post"
POST=$(curl -fsS -X POST "$API/api/posts" "${auth[@]}" -d '{"content":"Soft-Launch Smoke '"$(date -u +%H%M%S)"'"}')
POST_ID=$(echo "$POST" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
echo "post=$POST_ID"

echo "==> Like"
curl -fsS -X POST "$API/api/posts/$POST_ID/like" "${auth[@]}" -d '{}'
echo

echo "==> Comment"
curl -fsS -X POST "$API/api/posts/$POST_ID/comments" "${auth[@]}" -d '{"content":"smoke ok"}'
echo

echo "==> List posts"
curl -fsS "$API/api/posts?limit=5" "${auth[@]}" | head -c 300
echo

echo "==> Notifications"
curl -fsS "$API/api/notifications?limit=5" "${auth[@]}" | head -c 200
echo

echo ""
echo "SMOKE OK against $API"
