#!/usr/bin/env bash
# Simple worker startup script without ML model pre-loading
# This avoids timeout issues during model initialization

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"  # Go up one level to python-service root
WORKER_SCRIPT="$SCRIPT_DIR/analysis_worker.py"
SKIP_CHECK=false
VERBOSE=""

# Process arguments
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

echo "🚀 Démarrage du worker Python de Bluesky Copilot (mode simple)"
echo "📂 Script exécuté: $(basename "$0")"

# Load environment variables from .env if the file exists
if [ -f "$SCRIPT_DIR/.env" ]; then
  echo "📄 Chargement des variables d'environnement depuis .env"
  set -a  # Automatic export of variables
  source "$SCRIPT_DIR/.env"
  set +a  # Disable automatic export
fi

# Default environment variables if not defined
export ADONISJS_API_URL="${ADONISJS_API_URL:-http://localhost:8081}"
echo "API URL: $ADONISJS_API_URL"

# Check required environment variables
if [ -z "$INTERNAL_API_KEY" ]; then
  echo "❌ Erreur: Variable INTERNAL_API_KEY non définie"
  exit 1
fi

# Check that Poetry is available
if ! command -v poetry &> /dev/null; then
    echo "❌ Erreur: Poetry n'est pas installé"
    echo "   Installez Poetry avec: curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

# Check that pyproject.toml exists
if [ ! -f "$SCRIPT_DIR/pyproject.toml" ]; then
    echo "❌ Erreur: fichier pyproject.toml non trouvé dans $SCRIPT_DIR"
    exit 1
fi

# Install dependencies if necessary
echo "📦 Vérification et installation des dépendances Poetry..."
cd "$SCRIPT_DIR"
poetry install

# Python command via Poetry
PYTHON_CMD="poetry run python"

# Set up ML model cache directories
export HF_HOME="$SCRIPT_DIR/.model_cache"
export TRANSFORMERS_CACHE="$SCRIPT_DIR/.model_cache"
export HF_DATASETS_CACHE="$SCRIPT_DIR/.model_cache"
mkdir -p "$HF_HOME"

echo "⏩ Ignorer le pré-chargement des modèles ML pour éviter les timeouts"
echo "📝 Les modèles seront téléchargés automatiquement lors de la première utilisation"

# Check API connectivity if not skipped
if [ "$SKIP_CHECK" = false ]; then
  echo "🔍 Test de connectivité avec l'API AdonisJS..."
  if [ -n "$VERBOSE" ]; then
    $PYTHON_CMD -m test_worker_api
  else
    $PYTHON_CMD -m test_worker_api > /dev/null 2>&1
  fi
  
  if [ $? -ne 0 ]; then
    echo "❌ Erreur: Impossible de se connecter à l'API AdonisJS"
    echo "   Pour plus de détails, exécutez: ./scripts/start_worker_simple.sh --verbose"
    exit 1
  fi
  echo "✅ Connectivité avec l'API AdonisJS validée"
fi

# Start the analysis worker
echo "🔄 Démarrage du worker d'analyse..."
exec $PYTHON_CMD -u "$WORKER_SCRIPT"
