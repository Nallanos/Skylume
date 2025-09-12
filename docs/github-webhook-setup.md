# Configuration GitHub Webhook

Ce guide explique comment configurer un webhook GitHub pour déclencher automatiquement le rebuild de l'application Docker.

## 1. Accès aux paramètres du webhook

1. Allez dans votre repository GitHub
2. Cliquez sur **Settings** (Paramètres)
3. Dans le menu de gauche, cliquez sur **Webhooks**
4. Cliquez sur **Add webhook** (Ajouter un webhook)

## 2. Configuration du webhook

| Champ | Valeur |
|-------|---------|
| **Payload URL** | `https://votre-domaine.com/api/docker/github-webhook` |
| **Content type** | `application/x-www-form-urlencoded` OU `application/json` |
| **Secret** | `b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2` |
| **SSL verification** | ✅ Enable SSL verification |

## 3. Événements déclencheurs

Sélectionnez **Just the push event** pour déclencher le rebuild uniquement lors des push.

OU

Sélectionnez **Let me select individual events** et choisissez :
- ✅ Pushes
- ✅ Pull requests (optionnel)

## 4. Branches ciblées

Le webhook ne déclenchera un rebuild que pour les push sur la branche `main` (ou la branche par défaut configurée).

## 5. Test du webhook

Après configuration, vous pouvez tester le webhook :

1. Dans l'interface GitHub, cliquez sur votre webhook nouvellement créé
2. Allez dans l'onglet **Recent Deliveries**
3. Cliquez sur **Redeliver** pour un delivery existant, ou faites un push pour en créer un nouveau

## 6. Vérification des logs

Les logs du webhook sont visibles dans l'application et incluent :
- Réception du webhook
- Validation du secret
- Exécution du rebuild
- Résultat de l'opération

## Sécurité

⚠️ **Important** : Le secret configuré (`b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2`) doit rester confidentiel. GitHub l'utilise pour signer les payloads et votre application le vérifie pour s'assurer que les requêtes proviennent bien de GitHub.

## Flexibilité Content-Type

L'endpoint webhook supporte maintenant les deux content types :
- **application/json** : Format standard pour les APIs REST
- **application/x-www-form-urlencoded** : Format requis par certains services de webhook

Cette flexibilité assure une meilleure compatibilité avec différents fournisseurs de webhooks.