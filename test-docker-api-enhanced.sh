#!/bin/bash

# Test complet des endpoints Docker avec les deux content types
# Usage: ./test-docker-api-enhanced.sh

API_URL="http://localhost:8081"
SECRET="b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2"

echo "🧪 Test des endpoints Docker avec support multi content-type"
echo "=================================================="

# Test webhook avec application/json
echo ""
echo "📋 Test 1: Webhook GitHub avec Content-Type: application/json"
curl -X POST "$API_URL/api/docker/github-webhook" \
  -H "Content-Type: application/json" \
  -H "X-Docker-Secret: $SECRET" \
  -d '{
    "repository": {
      "name": "test-repo"
    },
    "ref": "refs/heads/main"
  }' \
  -w "\nStatus Code: %{http_code}\n"

echo ""
echo "=================================================="

# Test webhook avec application/x-www-form-urlencoded
echo ""
echo "📋 Test 2: Webhook GitHub avec Content-Type: application/x-www-form-urlencoded"
curl -X POST "$API_URL/api/docker/github-webhook" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "X-Docker-Secret: $SECRET" \
  -d 'payload={"repository":{"name":"test-repo"},"ref":"refs/heads/main"}' \
  -w "\nStatus Code: %{http_code}\n"

echo ""
echo "=================================================="

# Test rebuild standard
echo ""
echo "📋 Test 3: Rebuild rapide"
curl -X POST "$API_URL/api/docker/rebuild" \
  -H "Content-Type: application/json" \
  -H "X-Docker-Secret: $SECRET" \
  -d '{}' \
  -w "\nStatus Code: %{http_code}\n"

echo ""
echo "=================================================="

# Test avec secret incorrect
echo ""
echo "📋 Test 4: Test sécurité (secret incorrect)"
curl -X POST "$API_URL/api/docker/rebuild" \
  -H "Content-Type: application/json" \
  -H "X-Docker-Secret: wrong-secret" \
  -d '{}' \
  -w "\nStatus Code: %{http_code}\n"

echo ""
echo "=================================================="
echo "✅ Tests terminés"