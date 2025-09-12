#!/bin/bash

# Script de build et relance du container app
# Auteur: GitHub Copilot
# Date: $(date)

set -e  # Arrête le script en cas d'erreur

echo "🚀 Début du processus de build et relance du container app..."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
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

# Vérification que docker et docker-compose sont installés
if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "docker-compose n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

# Vérification que les fichiers nécessaires existent
if [ ! -f "Dockerfile" ]; then
    log_error "Dockerfile introuvable dans le répertoire courant"
    exit 1
fi

if [ ! -f "docker-compose.yaml" ]; then
    log_error "docker-compose.yaml introuvable dans le répertoire courant"
    exit 1
fi

if [ ! -f ".env" ]; then
    log_warning "Fichier .env introuvable - assurez-vous que les variables d'environnement sont configurées"
fi

log_info "Arrêt des services en cours..."
docker-compose down

log_info "Nettoyage complet du système Docker..."
docker system prune -af

log_info "Construction de l'image de l'application..."
docker-compose build app --no-cache

log_success "Image construite avec succès!"

log_info "Création d'une copie de sauvegarde du docker-compose.yaml..."
cp docker-compose.yaml docker-compose.yaml.backup

log_info "Activation du service app dans docker-compose.yaml..."
# Décommenter le service app
sed -i 's/^  # app:/  app:/' docker-compose.yaml
sed -i 's/^    # /    /' docker-compose.yaml

log_info "Démarrage de tous les services..."
docker-compose up -d

log_info "Attente que les services soient prêts..."
sleep 10

log_info "Vérification du statut des services..."
docker-compose ps

log_info "Vérification des logs de l'application..."
echo "=== Derniers logs de l'application ==="
docker-compose logs --tail=20 app

log_success "✅ Build et relance terminés avec succès!"
log_info "🌐 L'application devrait être accessible sur http://localhost:8081"
log_info "📊 Pour voir les logs en temps réel: docker-compose logs -f app"
log_info "🛑 Pour arrêter les services: docker-compose down"

# Optionnel: Ouvrir l'application dans le navigateur si DISPLAY est configuré
if [ ! -z "$DISPLAY" ] || [ ! -z "$BROWSER" ]; then
    log_info "Tentative d'ouverture de l'application dans le navigateur..."
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:8081 &
    elif [ ! -z "$BROWSER" ]; then
        "$BROWSER" http://localhost:8081 &
    fi
fi

echo "🎉 Script terminé!"