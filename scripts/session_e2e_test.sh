#!/usr/bin/env bash
set -euo pipefail

# Simple E2E session test using curl
# Usage: ./scripts/session_e2e_test.sh [BASE_URL]

BASE_URL=${1:-http://localhost:3000}
TMPDIR=$(mktemp -d)
COOKIEJAR="$TMPDIR/cookies.txt"
HEADERS="$TMPDIR/headers.txt"
DASHBODY="$TMPDIR/dashboard.html"
EMAIL="e2e+$(date +%s)@example.com"

echo "Running session E2E test against $BASE_URL"

echo "Registering user with email: $EMAIL"

# Do not follow redirects so we capture the Set-Cookie header in the registration response
curl -s -D "$HEADERS" -o /dev/null \
  -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "firstName=E2E&lastName=Tester&email=$EMAIL&password=Password123&confirmPassword=Password123" \
  --cookie-jar "$COOKIEJAR"

# Check for Set-Cookie
if grep -i "^Set-Cookie:" "$HEADERS" >/dev/null; then
  echo "[OK] Set-Cookie header present in registration response"
else
  echo "[FAIL] No Set-Cookie header in registration response"
  echo "Headers:" >&2
  cat "$HEADERS" >&2
  exit 2
fi

# Now request dashboard using saved cookie
HTTP_STATUS=$(curl -s -o "$DASHBODY" -w "%{http_code}" --cookie "$COOKIEJAR" "$BASE_URL/auth/dashboard")

if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "[OK] Dashboard accessible with session (HTTP 200)"
  echo "E2E test PASSED"
  # optional: print a small excerpt
  echo "--- dashboard snippet ---"
  sed -n '1,40p' "$DASHBODY"
  exit 0
else
  echo "[FAIL] Dashboard not accessible with saved cookie (HTTP $HTTP_STATUS)"
  echo "Dashboard response body:" >&2
  sed -n '1,200p' "$DASHBODY" >&2
  exit 3
fi
