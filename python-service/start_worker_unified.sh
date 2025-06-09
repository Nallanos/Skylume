#!/usr/bin/env bash
# Script de démarrage unifié du worker Python
# Ce script initialise l'environnement et démarre le worker d'analyse
# Usage: 
#  ./start_worker_unified.sh [--skip-check] [--verbose]
#  ./start_worker.sh [--skip-check] [--verbose]  # Pour compatibilité
#  ./start_bulk_worker.sh [--skip-check] [--verbose]  # Pour compatibilité

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

# Pré-chargement des modèles ML (évite les délais lors de la première requête)
echo "🤖 Initialisation des modèles ML (peut prendre 60-90s lors du premier démarrage)..."

# Set timeout for model download to prevent hanging
timeout 180 $PYTHON_CMD -c "
import sys
import time
import os
from pathlib import Path

print('📦 Vérification et téléchargement des dépendances ML...')

# Suppress deprecation warnings
import warnings
warnings.filterwarnings('ignore', category=FutureWarning)

start_time = time.time()

try:
    print('  ⬇️  Téléchargement du modèle de transformation de phrases...')
    
    # Force use of HF_HOME instead of deprecated TRANSFORMERS_CACHE
    os.environ['TRANSFORMERS_OFFLINE'] = '0'
    
    from sentence_transformers import SentenceTransformer
    
    # Use a specific timeout for model download
    print('     Connexion au serveur Hugging Face...')
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    print(f'  ✅ Modèle transformer prêt ({model.get_sentence_embedding_dimension()} dimensions)')
    
    print('  ⬇️  Téléchargement des données NLTK...')
    import nltk
    nltk.download('stopwords', quiet=True)
    nltk.download('punkt', quiet=True)
    print('  ✅ Données NLTK prêtes')
    
    print('  ⬇️  Chargement des composants scikit-learn...')
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.cluster import HDBSCAN
    print('  ✅ scikit-learn prêt')
    
    elapsed = time.time() - start_time
    print(f'🎉 Toutes les dépendances ML sont prêtes en {elapsed:.1f}s')
    
except Exception as e:
    print(f'❌ Erreur lors de la configuration ML: {e}')
    print('Le worker tentera de télécharger lors de l\'exécution')
    sys.exit(1)
"

MODEL_INIT_EXIT_CODE=$?

if [ $MODEL_INIT_EXIT_CODE -eq 124 ]; then
    echo "⏰ Timeout lors du téléchargement des modèles (3 minutes)"
    echo "🔄 Continuons sans pré-chargement - les modèles seront téléchargés lors de la première utilisation"
elif [ $MODEL_INIT_EXIT_CODE -ne 0 ]; then
    echo "❌ La configuration des dépendances ML a échoué (code: $MODEL_INIT_EXIT_CODE)"
    echo "🔄 Continuons sans pré-chargement - les modèles seront téléchargés lors de la première utilisation"
else
    echo "✅ Modèles ML pré-chargés et mis en cache"
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
