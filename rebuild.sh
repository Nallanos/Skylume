#!/bin/bash

# Script de rebuild rapide du container app
# Auteur: GitHub Copilot
# Version simplifiée pour les rebuilds fréquents

set -e

echo "🔄 Rebuild rapide du container app..."

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier si le service app est activé dans docker-compose.yaml
if grep -q "^  # app:" docker-compose.yaml; then
    log_warning "Le service app est commenté dans docker-compose.yaml"
    log_info "Activation automatique du service app..."
    
    # Créer une sauvegarde
    cp docker-compose.yaml docker-compose.yaml.backup
    
    # Décommenter le service app
    sed -i 's/^  # app:/  app:/' docker-compose.yaml
    sed -i 's/^    # /    /' docker-compose.yaml
    
    log_success "Service app activé!"
fi

log_info "Arrêt du service app..."
docker-compose stop app 2>/dev/null || log_warning "Service app n'était pas en cours d'exécution"

log_info "Nettoyage complet du système Docker..."
docker system prune -af

log_info "Rebuild de l'image app..."
docker-compose build app

log_info "Redémarrage du service app..."
docker-compose up -d app

log_info "Attente du démarrage..."
sleep 5

log_info "Vérification du statut..."
docker-compose ps app

log_success "✅ Rebuild rapide terminé!"
log_info "📊 Logs: docker-compose logs -f app"