#!/bin/bash

echo "🧪 Testing Stripe Webhook Reception..."
echo "======================================"

# URL du webhook local
WEBHOOK_URL="http://localhost:8081/stripe/webhook"

# Payload de test pour checkout.session.completed
TEST_PAYLOAD='{
  "id": "evt_test_webhook",
  "object": "event",
  "api_version": "2020-08-27",
  "created": 1626804511,
  "data": {
    "object": {
      "id": "cs_test_12345",
      "object": "checkout.session",
      "customer_details": {
        "email": "test@example.com"
      },
      "metadata": {
        "plan": "pro",
        "user_id": "1"
      },
      "subscription": "sub_test_12345",
      "mode": "subscription",
      "payment_status": "paid",
      "status": "complete"
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_test_12345",
    "idempotency_key": null
  },
  "type": "checkout.session.completed"
}'

echo "📤 Sending test webhook to: $WEBHOOK_URL"
echo "📦 Payload: Pro plan checkout completion"
echo ""

# Envoyer le webhook (sans signature pour le test)
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test_signature" \
  -d "$TEST_PAYLOAD" \
  -v

echo ""
echo "✅ Test webhook sent!"
echo "Check your server logs for webhook processing details."
