
# AdonisJS Redis - Résumé de la documentation

## 🧠 Objectif
Le package `@adonisjs/redis` permet d'utiliser **Redis** pour :
- stocker des données temporaires (cache, sessions…),
- publier/s'abonner à des événements (`pub/sub`),
- communiquer entre plusieurs instances d'une app Adonis.

---

## 🛠️ Installation
```bash
npm i @adonisjs/redis
node ace configure @adonisjs/redis
```
Cela installe le package et génère le fichier de config `config/redis.ts`.

---

## ⚙️ Configuration
- Utilise des variables d’environnement comme :
  ```env
  REDIS_CONNECTION=local
  REDIS_HOST=127.0.0.1
  REDIS_PORT=6379
  ```
- Tu peux définir plusieurs connexions Redis si nécessaire (`local`, `pubsub`, etc.).

---

## 💡 Utilisation de base
Importer Redis dans ton code :
```ts
import Redis from '@ioc:Adonis/Addons/Redis'
```

### ✅ Lire / écrire
```ts
await Redis.set('key', 'value')
const value = await Redis.get('key')
```

### ⏱️ Expiration automatique
```ts
await Redis.setex('key', 60, 'value') // expire après 60 secondes
```

---

## 📣 Pub/Sub (publication / abonnement)
Pour publier un événement :
```ts
await Redis.publish('notifications', 'message content')
```

Pour s’abonner :
```ts
Redis.subscribe('notifications', (message) => {
  console.log(message)
})
```

> ⚠️ Important : utilise une **connexion dédiée** pour le `subscribe` car elle est bloquante.

---

## 🧪 Connexions nommées
Si tu as plusieurs usages de Redis :
```ts
const pub = Redis.connection('pub')
const cache = Redis.connection('cache')
```

---

## 🧼 Fermeture propre
À utiliser pour éviter les fuites mémoire :
```ts
await Redis.quit()
```
