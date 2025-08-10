# Configuration des Secrets - Guide de Sécurité

## ⚠️ PROBLÈME DE SÉCURITÉ RÉSOLU

Les secrets étaient précédemment exposés directement dans le `docker-compose.yaml`, ce qui représentait un risque majeur de sécurité.

## 🔒 Solution Mise en Place

### 1. Variables d'Environnement
Le `docker-compose.yaml` utilise maintenant des variables d'environnement au lieu de valeurs en dur.

### 2. Fichiers de Configuration
- `.env.example` : Template avec des valeurs d'exemple (safe pour Git)
- `.env` : Contient vos vraies valeurs (ignoré par Git)

### 3. Configuration Requise

Copiez `.env.example` vers `.env` et remplissez avec vos vraies valeurs :

```bash
cp .env.example .env
```

Puis éditez `.env` avec vos secrets réels :

#### Variables Critiques à Changer :
- `APP_KEY` : Générez une nouvelle clé sécurisée
- `STRIPE_SECRET_KEY` : Votre vraie clé secrète Stripe
- `STRIPE_WEBHOOK_SECRET` : Votre secret webhook Stripe
- `INTERNAL_API_KEY` : Générez une nouvelle clé pour l'API interne

#### Génération de Clés Sécurisées :
```bash
# Pour APP_KEY (32 caractères aléatoires)
openssl rand -base64 32

# Pour INTERNAL_API_KEY
openssl rand -hex 32
```

## 🚨 Actions Urgentes Requises

1. **Régénérez toutes les clés exposées** dans Stripe Dashboard
2. **Changez APP_KEY** immédiatement
3. **Vérifiez les logs d'accès** pour détecter toute utilisation malveillante
4. **Activez la surveillance** des clés API Stripe

## 📋 Checklist de Sécurité

- [ ] Fichier `.env` contient les vraies valeurs
- [ ] `.env` est dans `.gitignore`
- [ ] Clés Stripe régénérées
- [ ] APP_KEY changée
- [ ] Tests effectués avec nouvelles clés
- [ ] Documentation équipe mise à jour

## 🔄 Pour le Déploiement

En production, utilisez un gestionnaire de secrets (AWS Secrets Manager, HashiCorp Vault, etc.) au lieu du fichier `.env`.
