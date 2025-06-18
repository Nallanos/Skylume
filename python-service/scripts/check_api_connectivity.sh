#!/usr/bin/env bash
# Script pour tester rapidement la connectivité entre le service Python et AdonisJS
# Usage: ./check_api_connectivity.sh [--verbose]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"  # Go up one level to python-service root
cd "$SCRIPT_DIR"

VERBOSE=""
if [ "$1" == "--verbose" ]; then
  VERBOSE="--verbose"
fi

echo "🔍 Test de connectivité avec l'API AdonisJS..."

# Vérification des variables d'environnement
if [ ! -f .env ]; then
  echo "⚠️  Fichier .env non trouvé, utilisation des variables d'environnement système"
fi

# Exécution du test de connectivité
if [ "$VERBOSE" == "--verbose" ]; then
  python -m test_worker_api
else
  python -m test_worker_api > /dev/null 2>&1
fi

if [ $? -eq 0 ]; then
  echo "✅ Connectivité avec l'API AdonisJS validée"
  exit 0
else
  echo "❌ Erreur: Impossible de se connecter à l'API AdonisJS"
  echo "   Vérifiez que:"
  echo "   - Le serveur AdonisJS est en cours d'exécution"
  echo "   - Les variables d'environnement ADONISJS_API_URL et INTERNAL_API_KEY sont correctement configurées"
  echo "   - Le réseau permet la communication entre les services"
  echo ""
  echo "   Pour plus de détails, exécutez: ./check_api_connectivity.sh --verbose"
  exit 1
fi
