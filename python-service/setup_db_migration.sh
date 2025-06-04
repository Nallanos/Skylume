#!/bin/bash

# Script pour configurer et tester la nouvelle architecture sans base de données

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE_FILE="$SCRIPT_DIR/.env.example"
TEST_SCRIPT="$SCRIPT_DIR/test_worker_api.py"

# Vérifier si le fichier .env existe, sinon le créer à partir de .env.example
if [ ! -f "$ENV_FILE" ]; then
    echo "Création du fichier .env à partir de .env.example..."
    cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
    echo "Fichier .env créé. Veuillez éditer ce fichier pour configurer l'API URL et la clé API."
fi

# Afficher des instructions
echo "=== Migration vers l'architecture sans base de données ==="
echo ""
echo "Pour tester la nouvelle architecture :"
echo ""
echo "1. Configurez les variables d'environnement dans le fichier .env :"
echo "   - ADONISJS_API_URL : URL de l'API AdonisJS (par défaut : http://localhost:8081)"
echo "   - INTERNAL_API_KEY : Clé API pour l'authentification (doit correspondre à celle d'AdonisJS)"
echo ""
echo "2. Exécutez le script de test pour vérifier la connectivité API :"
echo "   python3 $TEST_SCRIPT"
echo ""
echo "3. Si le test réussit, vous pouvez démarrer le worker avec :"
echo "   ./start_bulk_worker.sh"
echo ""
echo "4. Pour utiliser dans un environnement de production, configurez le worker comme un service système"
echo ""

# Demander à l'utilisateur s'il souhaite exécuter le test
read -p "Voulez-vous exécuter le test de connectivité API maintenant ? (o/n) " response
if [[ "$response" =~ ^[Oo]$ ]]; then
    echo "Exécution du test de connectivité API..."
    python3 "$TEST_SCRIPT"
fi
