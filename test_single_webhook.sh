#!/bin/bash

echo "🧪 Testing Single Webhook: checkout.session.completed"
echo "======================================================"

# URL du webhook local
WEBHOOK_URL="http://localhost:8081/stripe/webhook"

# Payload de test pour checkout.session.completed avec user_id correct
TEST_PAYLOAD='{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_single_123",
      "metadata": {
        "plan": "pro",
        "user_id": "allanbe.bsky.social"
      },
      "customer_details": {
        "email": "allanbe.bsky.social"
      },
      "subscription": "sub_test_single_123"
    }
  }
}'

echo "📤 Sending checkout.session.completed webhook to: $WEBHOOK_URL"
echo "🎯 Testing with user: allanbe.bsky.social"
echo "📦 Payload: Pro plan checkout completion"
echo ""

# Envoyer le webhook
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test_signature" \
  -d "$TEST_PAYLOAD" \
  -v

echo ""
echo "✅ Webhook sent! Check server logs and user plan."
