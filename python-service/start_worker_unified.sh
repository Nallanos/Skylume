#!/usr/bin/env bash
# Script de démarrage unifié du worker Python
# Ce script initialise l'environnement et démarre le worker d'analyse
# Usage: ./start_worker.sh [--skip-check] [--verbose]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_SCRIPT="$SCRIPT_DIR/analysis_worker.py"
SKIP_CHECK=false
VERBOSE=""

# Traitement des arguments
for arg in "$@"; do
  case $arg in
    --skip-check)
      SKIP_CHECK=true
      shift
      ;;
    --verbose)
      VERBOSE="--verbose"
      shift
      ;;
  esac
done

echo "🚀 Démarrage du worker Python de Bluesky Copilot"

# Variables d'environnement par défaut si non définies
export ADONISJS_API_URL="${ADONISJS_API_URL:-http://localhost:8081}"
echo "API URL: $ADONISJS_API_URL"

# Vérification des variables d'environnement requises
if [ -z "$INTERNAL_API_KEY" ]; then
  echo "❌ Erreur: Variable INTERNAL_API_KEY non définie"
  exit 1
fi

# Vérification que Python est disponible
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "❌ Erreur: ni python ni python3 ne sont installés"
    exit 1
fi

# Commande Python (utiliser python3 si disponible, sinon python)
PYTHON_CMD="python"
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
fi

# Vérification de la connectivité avec AdonisJS si non ignorée
if [ "$SKIP_CHECK" = false ]; then
  echo "🔍 Test de connectivité avec l'API AdonisJS..."
  if [ -n "$VERBOSE" ]; then
    $PYTHON_CMD -m test_worker_api
  else
    $PYTHON_CMD -m test_worker_api > /dev/null 2>&1
  fi
  
  if [ $? -ne 0 ]; then
    echo "❌ Erreur: Impossible de se connecter à l'API AdonisJS"
    echo "   Pour plus de détails, exécutez: ./start_worker.sh --verbose"
    exit 1
  fi
  echo "✅ Connectivité avec l'API AdonisJS validée"
fi

# Démarrage du worker d'analyse
echo "🔄 Démarrage du worker d'analyse..."
exec $PYTHON_CMD -u "$WORKER_SCRIPT"
