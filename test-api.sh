#!/bin/bash
# Test CRUD and notes_for_me endpoint

set -e

echo "=== 1. Login to get JWT token ==="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"armin@cybertec.at"}')
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
echo "User: $(echo "$LOGIN_RESPONSE" | jq -r '.user.email') ($(echo "$LOGIN_RESPONSE" | jq -r '.user.role'))"
echo "Token: ${TOKEN:0:50}..."

echo ""
echo "=== 2. GET /note (READ all notes) ==="
curl -s http://localhost:3000/note \
  -H "Authorization: Bearer $TOKEN" | jq '[.[] | {title, author_id}]'

echo ""
echo "=== 3. POST /note (CREATE) ==="
NEW_NOTE=$(curl -s -X POST http://localhost:3000/note \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"title":"Test Note from Script","body":"Created via API test"}')
echo "$NEW_NOTE" | jq '.[0] | {id, title, body}'
NOTE_ID=$(echo "$NEW_NOTE" | jq -r '.[0].id')
echo "Created note ID: $NOTE_ID"

echo ""
echo "=== 4. PATCH /note (UPDATE) ==="
curl -s -X PATCH "http://localhost:3000/note?id=eq.$NOTE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"title":"Updated Test Note","body":"Modified body"}' | jq '.[0] | {id, title, body}'

echo ""
echo "=== 5. POST /rpc/notes_for_me (RPC function) ==="
curl -s -X POST http://localhost:3000/rpc/notes_for_me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '[.[] | .title]'

echo ""
echo "=== 6. DELETE /note ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "http://localhost:3000/note?id=eq.$NOTE_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "Delete status: $HTTP_CODE"

echo ""
echo "=== 7. Verify deletion ==="
COUNT=$(curl -s http://localhost:3000/note \
  -H "Authorization: Bearer $TOKEN" | jq 'length')
echo "Remaining notes: $COUNT"

echo ""
echo "=== Test with different tenant (Ivan Corp) ==="
IVAN_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ivan@corp.com"}' | jq -r '.token')
echo "Ivan Corp notes:"
curl -s http://localhost:3000/note \
  -H "Authorization: Bearer $IVAN_TOKEN" | jq '[.[] | .title]'
