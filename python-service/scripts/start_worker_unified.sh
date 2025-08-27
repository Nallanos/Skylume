#!/usr/bin/env bash
# Script de démarrage unifié du worker Python
# Ce script initialise l'environnement et démarre le worker d'analyse
# Usage: 
#  ./start_worker_unified.sh [--skip-check] [--verbose]
#  ./start_worker.sh [--skip-check] [--verbose]  # Pour compatibilité
#  ./start_bulk_worker.sh [--skip-check] [--verbose]  # Pour compatibilité

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"  # Go up one level to python-service root
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

echo "🚀 Démarrage du worker Python de Skynalytic"
echo "📂 Script exécuté: $(basename "$0") (via $(basename "$(readlink /proc/$$/exe)"))"

# Chargement des variables d'environnement depuis .env si le fichier existe
if [ -f "$SCRIPT_DIR/.env" ]; then
  echo "📄 Chargement des variables d'environnement depuis .env"
  set -a  # Export automatique des variables
  source "$SCRIPT_DIR/.env"
  set +a  # Désactiver l'export automatique
fi

# Variables d'environnement par défaut si non définies
export ADONISJS_API_URL="${ADONISJS_API_URL:-http://localhost:8081}"
echo "API URL: $ADONISJS_API_URL"

# Vérification des variables d'environnement requises
if [ -z "$INTERNAL_API_KEY" ]; then
  echo "❌ Erreur: Variable INTERNAL_API_KEY non définie"
  exit 1
fi

# Vérification que Poetry est disponible
if ! command -v poetry &> /dev/null; then
    echo "❌ Erreur: Poetry n'est pas installé"
    echo "   Installez Poetry avec: curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

# Vérification que pyproject.toml existe
if [ ! -f "$SCRIPT_DIR/pyproject.toml" ]; then
    echo "❌ Erreur: fichier pyproject.toml non trouvé dans $SCRIPT_DIR"
    exit 1
fi

# Installation des dépendances si nécessaire
echo "📦 Vérification et installation des dépendances Poetry..."
cd "$SCRIPT_DIR"
poetry install

# Commande Python via Poetry
PYTHON_CMD="poetry run python"

# Optimisation de cache pour les modèles ML
export HF_HOME="$SCRIPT_DIR/.model_cache"
export TRANSFORMERS_CACHE="$SCRIPT_DIR/.model_cache"
export HF_DATASETS_CACHE="$SCRIPT_DIR/.model_cache"
mkdir -p "$HF_HOME"

# Skip ML model pre-loading to avoid startup delays
echo "⚡ Démarrage rapide - les modèles ML seront téléchargés lors de la première utilisation"

# Vérification de la connectivité avec AdonisJS si non ignorée
if [ "$SKIP_CHECK" = false ]; then
  echo "🔍 Test de connectivité avec l'API AdonisJS..."
  if [ -n "$VERBOSE" ]; then
    $PYTHON_CMD tests/test_worker_api.py
  else
    $PYTHON_CMD tests/test_worker_api.py > /dev/null 2>&1
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
