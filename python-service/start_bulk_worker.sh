#!/bin/bash

# Script pour démarrer le worker d'analyse en bulk
# Ce script peut être utilisé avec systemd, PM2, ou manuellement

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SERVICE_DIR="$SCRIPT_DIR"
WORKER_SCRIPT="$PYTHON_SERVICE_DIR/analysis_worker.py"

# Variables d'environnement par défaut
export ADONISJS_API_URL="${ADONISJS_API_URL:-http://localhost:8081}"

echo "Démarrage du worker d'analyse en bulk..."
echo "API URL: $ADONISJS_API_URL"
echo "Script: $WORKER_SCRIPT"

# Vérifier que le script existe
if [ ! -f "$WORKER_SCRIPT" ]; then
    echo "Erreur: Le script worker n'existe pas à $WORKER_SCRIPT"
    exit 1
fi

# Vérifier que Python est disponible
if ! command -v python3 &> /dev/null; then
    echo "Erreur: python3 n'est pas installé"
    exit 1
fi

# Se déplacer dans le répertoire du service Python
cd "$PYTHON_SERVICE_DIR"

# Démarrer le worker
echo "Démarrage du worker..."
exec python3 "$WORKER_SCRIPT"
