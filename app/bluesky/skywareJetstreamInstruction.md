# Jetstream - Guide d’utilisation

`@skyware/jetstream` est une bibliothèque utilitaire permettant de consommer des données provenant d’une instance Jetstream via WebSocket.

## Installation et démarrage

```ts
import { Jetstream } from '@skyware/jetstream'

const jetstream = new Jetstream()
jetstream.start()
```

### Paramètres du constructeur `Jetstream`

- **wantedCollections** : Tableau de collections à écouter (ex. `"app.bsky.feed.*"` pour un filtre par motif). Si vide ou non fourni, toutes les collections sont écoutées.
- **wantedDids** : Tableau de DIDs (identifiants décentralisés) à écouter. Si vide ou non fourni, tous les DIDs sont écoutés.
- **cursor** : Timestamp Unix en microsecondes pour démarrer l’écoute. Si non fourni, l’écoute commence à partir de l’événement le plus récent.
- **endpoint** : URL de l’instance Jetstream (par défaut : `wss://jetstream1.us-east.bsky.network/subscribe`).

## Écoute d’événements

Jetstream propose des méthodes pour écouter les événements d’un dépôt :

```ts
jetstream.onCreate('app.bsky.feed.post', (event) => {
  console.log('Nouveau post :', event.commit.record.text)
})
```

### Méthodes principales

- **onCreate(collection, listener)** : Écoute des enregistrements créés dans une collection.
- **onUpdate(collection, listener)** : Écoute des mises à jour d’enregistrements.
- **onDelete(collection, listener)** : Écoute des suppressions d’enregistrements.

### Événements globaux

```ts
import { CommitType } from '@skyware/jetstream'

jetstream.on('commit', (event) => {
  if (event.commit.operation === CommitType.Create) {
    console.log('Création dans', event.commit.collection, event.commit.record)
  } else if (event.commit.operation === CommitType.Update) {
    console.log('Mise à jour dans', event.commit.collection, event.commit.rkey)
  } else if (event.commit.operation === CommitType.Delete) {
    console.log('Suppression dans', event.commit.collection, event.commit.rkey)
  }
})

jetstream.on('account', (event) => {
  console.log('Mise à jour du compte', event.account.status)
})

jetstream.on('identity', (event) => {
  console.log('Mise à jour de l’identité', event.identity.did)
})
```

Utiliser Jetstream permet de filtrer les événements utiles, réduisant ainsi la consommation de bande passante comparé à une connexion directe au relay.

## Événements disponibles

### Événements de mise à jour

| Événement  | Description                                                      |
| ---------- | ---------------------------------------------------------------- |
| `commit`   | Engagement dans un dépôt utilisateur.                            |
| `identity` | Modification de l’identité du compte.                            |
| `account`  | Modification de l’état du compte (suspension, suppression, etc). |

### Événements système

| Événement | Description                                         |
| --------- | --------------------------------------------------- |
| `open`    | Connexion WebSocket ouverte.                        |
| `close`   | Connexion WebSocket fermée.                         |
| `error`   | Erreur survenue pendant le traitement d’un message. |

## Classe `Jetstream`

### Hérite de : `TinyEmitter`

### Propriétés

- **ws** : Connexion WebSocket (type `ReconnectingWebSocket`)
- **url** : URL de connexion
- **cursor** : Curseur courant (timestamp)

### Méthodes

- `start()` : Ouvre la connexion WebSocket.
- `close()` : Ferme la connexion.
- `onCreate(collection, listener)` : Abonnement aux créations.
- `onUpdate(collection, listener)` : Abonnement aux mises à jour.
- `onDelete(collection, listener)` : Abonnement aux suppressions.
- `on(event, listener)` : Abonnement aux événements système (`open`, `close`, `error`, etc.).
- `updateOptions(payload)` : Met à jour les options de connexion en cours.

```ts
jetstream.updateOptions({
  wantedCollections: ['app.bsky.feed.post'],
  wantedDids: ['did:example:123'],
})
```

## Configuration TypeScript

Pour éviter des erreurs de typage, vérifiez que votre fichier `tsconfig.json` contient :

```json
{
  "compilerOptions": {
    "moduleResolution": "node16"
  }
}
```
