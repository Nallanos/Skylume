# 🔒 Guide de Déploiement Sécurisé - Production

## ✅ Améliorations de Sécurité Appliquées

### 1. **Configuration Shield (CSRF & CSP)**
- ✅ **CSRF Protection** : Activée avec exceptions pour webhooks
- ✅ **CSP (Content Security Policy)** : Configurée pour Stripe et Bluesky
- ✅ **X-Frame Protection** : DENY pour éviter le clickjacking
- ✅ **HSTS** : Forcé HTTPS en production

### 2. **Configuration CORS Sécurisée**
- ✅ **Domaines autorisés** : Seulement `bluesky-bot.com` en production
- ✅ **Développement flexible** : localhost autorisé en dev uniquement
- ✅ **Credentials** : Contrôlés et sécurisés

### 3. **Sessions Sécurisées**
- ✅ **Duration réduite** : 2 jours au lieu de 7
- ✅ **Cookies sécurisés** : HttpOnly, Secure, SameSite=strict
- ✅ **HTTPS requis** : En production uniquement

### 4. **Rate Limiting**
- ✅ **API générale** : 100 req/min par IP
- ✅ **Authentication** : 5 tentatives/15min
- ✅ **Webhooks Stripe** : 1000 req/min
- ✅ **Redis stockage** : Avec expiration automatique

### 5. **Headers de Sécurité**
- ✅ **X-Content-Type-Options** : nosniff
- ✅ **X-XSS-Protection** : Mode bloc activé
- ✅ **Referrer-Policy** : strict-origin-when-cross-origin
- ✅ **Permissions-Policy** : Caméra/micro désactivés

## 🚨 Actions Critiques Avant Déploiement

### 1. **Régénérer les Secrets**
```bash
# Générer une nouvelle APP_KEY
openssl rand -base64 32

# Générer une nouvelle INTERNAL_API_KEY
openssl rand -hex 32

# Régénérer les clés Stripe dans le dashboard
```

### 2. **Variables d'Environnement**
Copier `.env.production` et remplir avec les vraies valeurs :
```bash
cp .env.production .env
```

### 3. **Configuration Docker**
Mettre à jour le docker-compose.yaml pour utiliser les variables :
```yaml
environment:
  - NODE_ENV=production
  - LOG_LEVEL=info
```

### 4. **Base de Données**
```bash
# Migrations en production
node ace migration:run --force

# Vérifier les indexes de performance
node ace db:seed # Si nécessaire
```

### 5. **SSL/TLS**
- ✅ Certificats Let's Encrypt configurés
- ⚠️ Vérifier le renouvellement automatique
- ⚠️ Tester HTTPS avec SSL Labs

## 🔧 Configuration Finale

### Variables d'Environnement Requises
```bash
# Sécurité
APP_KEY="[NOUVELLE_CLE_SECURE_32_CHARS]"
INTERNAL_API_KEY="[NOUVELLE_CLE_API_INTERNE]"

# Stripe (RÉGÉNÉRÉES)
STRIPE_PUBLIC_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Base de données
DB_PASSWORD="[MOT_DE_PASSE_SECURISE]"
REDIS_PASSWORD="[MOT_DE_PASSE_REDIS]"
```

### Rate Limiting par Route
```typescript
// Dans routes.ts, ajouter :
router.group(() => {
  // Routes API
}).use(middleware.rate_limit({ max: 100, windowMs: 60000 }))

router.group(() => {
  // Routes d'authentification
}).use(middleware.rate_limit({ max: 5, windowMs: 900000 }))
```

### Monitoring Recommandé
```bash
# Logs de sécurité
tail -f logs/app.log | grep -E "(CSRF|Rate|Security)"

# Monitoring Redis
redis-cli monitor

# Vérification des certificats
openssl x509 -in /path/to/cert -text -noout
```

## 📊 Tests de Sécurité

### 1. **Test CSRF**
```bash
curl -X POST https://bluesky-bot.com/api/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
# Doit retourner 403 sans token CSRF
```

### 2. **Test Rate Limiting**
```bash
for i in {1..101}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://bluesky-bot.com/api/status
done
# Les dernières requêtes doivent retourner 429
```

### 3. **Test Headers de Sécurité**
```bash
curl -I https://bluesky-bot.com
# Vérifier la présence des headers X-Content-Type-Options, etc.
```

## 🚀 Commandes de Déploiement

```bash
# 1. Arrêter les services
docker-compose down

# 2. Mettre à jour les images
docker-compose pull

# 3. Reconstruire avec la nouvelle config
docker-compose build --no-cache

# 4. Démarrer en production
docker-compose up -d

# 5. Vérifier les logs
docker-compose logs -f app

# 6. Tester l'application
curl -I https://bluesky-bot.com/health
```

## ⚠️ Checklist Finale

- [ ] Secrets régénérés et configurés
- [ ] Variables d'environnement mises à jour
- [ ] Tests de sécurité passés
- [ ] Monitoring configuré
- [ ] Backup de la base de données effectué
- [ ] DNS pointant vers le bon serveur
- [ ] Certificats SSL valides
- [ ] Rate limiting testé
- [ ] Logs de sécurité configurés
- [ ] Documentation équipe mise à jour

## 📞 Support

En cas de problème de sécurité :
1. Vérifier les logs : `docker-compose logs app`
2. Tester les endpoints : `/health`, `/api/status`
3. Vérifier Redis : `redis-cli ping`
4. Consulter ce guide pour la configuration

---

**🔥 IMPORTANT** : Ces configurations de sécurité peuvent casser certaines fonctionnalités en développement. Utilisez `NODE_ENV=development` pour un environnement plus permissif.
