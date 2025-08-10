#!/bin/bash

# Script de configuration sécurisée pour Bluesky Copilot
# Ce script aide à générer des clés sécurisées et configure l'environnement

echo "🔒 Configuration Sécurisée - Bluesky Copilot"
echo "============================================="

# Vérifier si .env existe déjà
if [ -f ".env" ]; then
    echo "⚠️  Le fichier .env existe déjà."
    read -p "Voulez-vous le sauvegarder et le recréer? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp .env .env.backup
        echo "✅ Sauvegarde créée : .env.backup"
    else
        echo "❌ Configuration annulée."
        exit 1
    fi
fi

# Copier le template
cp .env.example .env
echo "✅ Fichier .env créé à partir du template"

# Générer une nouvelle APP_KEY
echo "🔑 Génération d'une nouvelle APP_KEY..."
NEW_APP_KEY=$(openssl rand -base64 32)
sed -i "s/CHANGE_ME_generate_secure_32_char_key/$NEW_APP_KEY/g" .env
echo "✅ APP_KEY générée et configurée"

# Générer une nouvelle INTERNAL_API_KEY
echo "🔑 Génération d'une nouvelle INTERNAL_API_KEY..."
NEW_API_KEY=$(openssl rand -hex 32)
sed -i "s/CHANGE_ME_generate_secure_api_key/$NEW_API_KEY/g" .env
echo "✅ INTERNAL_API_KEY générée et configurée"

echo ""
echo "🚨 ACTIONS MANUELLES REQUISES :"
echo "================================"
echo "1. Éditez le fichier .env et remplacez :"
echo "   - STRIPE_PUBLIC_KEY=pk_test_CHANGE_ME_your_test_public_key"
echo "   - STRIPE_SECRET_KEY=sk_test_CHANGE_ME_your_test_secret_key" 
echo "   - STRIPE_PRICE_ID=price_CHANGE_ME_your_price_id"
echo "   - STRIPE_WEBHOOK_SECRET=whsec_CHANGE_ME_your_webhook_secret"
echo "   - BLUESKY_IDENTIFIER=your_bluesky_identifier"
echo "   - BLUESKY_PASSWORD=your_bluesky_password"
echo ""
echo "2. 🔥 IMPORTANT : Régénérez vos clés Stripe dans le dashboard !"
echo "3. Testez la configuration avec : docker-compose up"
echo ""
echo "✅ Configuration de base terminée !"
echo "📖 Consultez SECURITY_SECRETS_GUIDE.md pour plus d'informations"
