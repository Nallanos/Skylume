# API Docker - Documentation

Cette API permet de gérer les opérations Docker de l'application via des endpoints sécurisés.

## Authentification

Tous les endpoints nécessitent le secret suivant dans l'en-tête `X-Docker-Secret` :
```
b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2
```

## Endpoints

### 1. Rebuild rapide
```bash
POST /api/docker/rebuild
Content-Type: application/json
X-Docker-Secret: b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2

{}
```

**Utilise** : `rebuild.sh`

### 2. Rebuild complet avec cleanup
```bash
POST /api/docker/full-rebuild
Content-Type: application/json
X-Docker-Secret: b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2

{}
```

**Utilise** : `build.sh`

### 3. Nettoyage Docker
```bash
POST /api/docker/clean
Content-Type: application/json
X-Docker-Secret: b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2

{}
```

**Exécute** : `docker system prune -af`

### 4. Webhook GitHub (Rebuild automatique)
```bash
POST /api/docker/github-webhook
Content-Type: application/json OU application/x-www-form-urlencoded
X-Docker-Secret: b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2

{
  "repository": {
    "name": "nom-du-repo"
  },
  "ref": "refs/heads/main"
}
```

**Note** : Supporte les deux content types pour une meilleure compatibilité avec les différents fournisseurs de webhooks.

## Réponses

### Succès
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "output": "..."
}
```

### Erreur
```json
{
  "success": false,
  "error": "Error message"
}
```

## Tests

Utilisez le script `test-docker-api.sh` pour tester tous les endpoints :

```bash
./test-docker-api.sh
```