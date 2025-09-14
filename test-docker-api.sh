#!/bin/bash

# Script de test pour les endpoints Docker API
# Usage: ./test-docker-api.sh [base_url] [session_cookie]

BASE_URL=${1:-"http://localhost:8081"}
SESSION_COOKIE=${2:-""}
SECRET="b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Headers communs
HEADERS=(-H "Content-Type: application/json")
if [ ! -z "$SESSION_COOKIE" ]; then
    HEADERS+=(-H "Cookie: $SESSION_COOKIE")
fi

echo "🧪 Test des endpoints Docker API"
echo "================================="
echo "Base URL: $BASE_URL"
echo "Secret: ${SECRET:0:8}..."
echo ""

# Test 1: Status (GET avec header)
log_info "Test 1: GET /api/docker/status (avec header)"
response=$(curl -s -w "\n%{http_code}" \
    -X GET "$BASE_URL/api/docker/status" \
    -H "X-Docker-Secret: $SECRET" \
    "${HEADERS[@]}")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    log_success "Status endpoint fonctionne (HTTP $http_code)"
    echo "$body" | jq . 2>/dev/null || echo "$body"
else
    log_error "Status endpoint a échoué (HTTP $http_code)"
    echo "$body"
fi
echo ""

# Test 2: Status (GET avec query param)
log_info "Test 2: GET /api/docker/status (avec query param)"
response=$(curl -s -w "\n%{http_code}" \
    -X GET "$BASE_URL/api/docker/status?secret=$SECRET" \
    "${HEADERS[@]}")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    log_success "Status endpoint avec query param fonctionne (HTTP $http_code)"
else
    log_error "Status endpoint avec query param a échoué (HTTP $http_code)"
    echo "$body"
fi
echo ""

# Test 3: Logs (GET)
log_info "Test 3: GET /api/docker/logs (avec header)"
response=$(curl -s -w "\n%{http_code}" \
    -X GET "$BASE_URL/api/docker/logs?lines=10" \
    -H "X-Docker-Secret: $SECRET" \
    "${HEADERS[@]}")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    log_success "Logs endpoint fonctionne (HTTP $http_code)"
    echo "$body" | jq . 2>/dev/null || echo "$body"
else
    log_error "Logs endpoint a échoué (HTTP $http_code)"
    echo "$body"
fi
echo ""

# Test 4: Test avec mauvais secret
log_info "Test 4: GET /api/docker/status (mauvais secret)"
response=$(curl -s -w "\n%{http_code}" \
    -X GET "$BASE_URL/api/docker/status" \
    -H "X-Docker-Secret: wrong-secret" \
    "${HEADERS[@]}")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "403" ]; then
    log_success "Sécurité fonctionne - mauvais secret rejeté (HTTP $http_code)"
else
    log_warning "Sécurité inattendue - code: $http_code"
    echo "$body"
fi
echo ""

# Test 5: Nettoyage Docker (nouveau)
log_info "Test 5: POST /api/docker/clean"
response=$(curl -s -w "\n%{http_code}" \
    -X POST "$BASE_URL/api/docker/clean" \
    -H "X-Docker-Secret: $SECRET" \
    "${HEADERS[@]}")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    log_success "Clean endpoint fonctionne (HTTP $http_code)"
    echo "$body" | jq . 2>/dev/null || echo "$body"
else
    log_error "Clean endpoint a échoué (HTTP $http_code)"
    echo "$body"
fi
echo ""

# Test 6: Rebuild (POST - ATTENTION: va vraiment rebuilder!)
read -p "Voulez-vous tester le rebuild? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Test 6: POST /api/docker/rebuild (avec body)"
    response=$(curl -s -w "\n%{http_code}" \
        -X POST "$BASE_URL/api/docker/rebuild" \
        "${HEADERS[@]}" \
        -d "{\"secret\": \"$SECRET\"}")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "200" ]; then
        log_success "Rebuild endpoint fonctionne (HTTP $http_code)"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    else
        log_error "Rebuild endpoint a échoué (HTTP $http_code)"
        echo "$body"
    fi
else
    log_info "Test de rebuild ignoré"
fi

echo ""
echo "🏁 Tests terminés!"
echo ""
echo "💡 Pour obtenir un session cookie:"
echo "   1. Connectez-vous sur $BASE_URL"
echo "   2. Ouvrez les DevTools (F12)"
echo "   3. Onglet Application/Storage > Cookies"
echo "   4. Copiez la valeur du cookie de session"
echo "   5. Relancez: ./test-docker-api.sh $BASE_URL 'session_cookie_value'"