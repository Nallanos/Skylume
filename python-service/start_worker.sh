#!/usr/bin/env bash
# Script de démarrage du worker Python en production
# Ce script initialise l'environnement et démarre le worker d'analyse

set -e

echo "🚀 Démarrage du worker Python de Bluesky Copilot"

# Vérification des variables d'environnement
if [ -z "$ADONISJS_API_URL" ]; then
  echo "⚠️  Variable ADONISJS_API_URL non définie, utilisation de la valeur par défaut"
fi

if [ -z "$INTERNAL_API_KEY" ]; then
  echo "❌ Erreur: Variable INTERNAL_API_KEY non définie"
  exit 1
fi

# Vérification de la connectivité avec AdonisJS
echo "🔍 Test de connectivité avec l'API AdonisJS..."
python -m test_worker_api
if [ $? -ne 0 ]; then
  echo "❌ Erreur: Impossible de se connecter à l'API AdonisJS"
  exit 1
fi

echo "✅ Connectivité avec l'API AdonisJS validée"

# Démarrage du worker d'analyse
echo "🔄 Démarrage du worker d'analyse..."
python -u analysis_worker.py
