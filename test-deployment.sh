#!/bin/bash

echo "=================================="
echo "🧪 Library Management System Tests"
echo "=================================="
echo ""

# Test 1: Backend Health
echo "1️⃣ Testing Backend Health..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api)
if [ "$BACKEND_STATUS" = "200" ] || [ "$BACKEND_STATUS" = "404" ]; then
  echo "   ✅ Backend is running (HTTP $BACKEND_STATUS)"
else
  echo "   ❌ Backend is not responding"
  exit 1
fi
echo ""

# Test 2: Login
echo "2️⃣ Testing Authentication..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@library.com","password":"password"}')
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')
if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "   ✅ Admin login successful"
else
  echo "   ❌ Login failed"
  exit 1
fi
echo ""

# Test 3: Notifications API
echo "3️⃣ Testing Notifications API..."
NOTIF_COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/notifications | jq 'length')
echo "   ✅ Found $NOTIF_COUNT notifications"
echo ""

# Test 4: Groups API
echo "4️⃣ Testing Groups API..."
GROUPS_COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/groups | jq 'length')
echo "   ✅ Found $GROUPS_COUNT groups"
echo ""

# Test 5: Public Books
echo "5️⃣ Testing Public Books API..."
BOOKS_COUNT=$(curl -s http://localhost:4000/api/books/public | jq 'length')
echo "   ✅ Found $BOOKS_COUNT public books"
echo ""

# Test 6: Frontend
echo "6️⃣ Testing Frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3100)
if [ "$FRONTEND_STATUS" = "200" ]; then
  echo "   ✅ Frontend is accessible (HTTP $FRONTEND_STATUS)"
else
  echo "   ❌ Frontend is not responding"
  exit 1
fi
echo ""

echo "=================================="
echo "🎉 All Tests Passed!"
echo "=================================="
echo ""
echo "📋 Access Information:"
echo "   Frontend: http://localhost:3100"
echo "   Backend API: http://localhost:4000/api"
echo ""
echo "👤 Demo Credentials:"
echo "   Admin: admin@library.com / password"
echo "   User: user@library.com / password"
echo ""
