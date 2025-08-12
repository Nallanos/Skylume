# Nouvelles Fonctions de Post Bluesky avec Images et Warnings

## Vue d'ensemble

Le `AccountService` a été étendu avec de nouvelles méthodes spécialisées pour poster du contenu sur Bluesky avec un meilleur support des images et des content warnings (labels de contenu).

## Nouvelles Méthodes

### 1. `createPostWithMedia(account, options)`

Méthode principale pour créer des posts avec images et labels de contenu.

```typescript
interface PostOptions {
  text: string;
  images?: PostImage[];
  labels?: string[]; // "porn", "nudity", "sexual", "graphic-media", "gore"
}

interface PostImage {
  file: Buffer;
  alt: string;
  mimeType?: string;
}
```

**Exemple d'utilisation :**
```typescript
const result = await accountService.createPostWithMedia(account, {
  text: 'Mon message avec image',
  images: [
    {
      file: imageBuffer,
      alt: 'Description de l\'image',
      mimeType: 'image/jpeg'
    }
  ],
  labels: ['sexual'] // Content warning optionnel
});
```

### 2. `postNSFWContent(account, text, images, contentType)`

Fonction helper pour poster facilement du contenu NSFW avec warnings.

```typescript
type ContentWarningType = 'porn' | 'nudity' | 'sexual' | 'graphic-media' | 'gore';
```

**Exemple d'utilisation :**
```typescript
const nsfwPost = await accountService.postNSFWContent(
  account,
  'Contenu explicite avec warning',
  [
    {
      file: imageBuffer,
      alt: 'Image explicite',
      mimeType: 'image/jpeg'
    }
  ],
  'porn' // Type de contenu NSFW
);
```

### 3. `postSafeContent(account, text, images?)`

Fonction helper pour poster du contenu normal sans warnings.

**Exemple d'utilisation :**
```typescript
const safePost = await accountService.postSafeContent(
  account,
  'Mes photos de vacances',
  [
    {
      file: imageBuffer1,
      alt: 'Plage tropicale'
    },
    {
      file: imageBuffer2,
      alt: 'Coucher de soleil'
    }
  ]
);
```

### 4. `postWithImagePaths(account, text, imagePaths, altTexts?, contentWarnings?)`

Fonction pour utiliser des chemins d'images (compatible avec l'ancienne méthode).

**Exemple d'utilisation :**
```typescript
const pathPost = await accountService.postWithImagePaths(
  account,
  'Post avec chemins d\'images',
  ['images/photo1.jpg', 'images/photo2.jpg'],
  ['Alt text 1', 'Alt text 2'],
  ['sexual'] // Content warnings optionnels
);
```

## Types de Content Warnings Supportés

| Type | Description | Label Bluesky |
|------|-------------|---------------|
| `porn` | Contenu pornographique | `porn` |
| `nudity` | Nudité | `nudity` |
| `sexual` | Contenu sexuel | `sexual` |
| `graphic-media` | Contenu graphique/violent | `graphic-media` |
| `gore` | Contenu sanglant/gore | `gore` |

## Rétrocompatibilité

L'ancienne méthode `post()` a été refactorisée pour utiliser les nouvelles fonctions en interne, garantissant ainsi la rétrocompatibilité complète :

```typescript
// Cette méthode fonctionne toujours comme avant
await accountService.post(
  account, 
  'Message', 
  ['images/photo.jpg'], 
  ['Alt text'], 
  ['adult'] // Automatiquement mappé vers 'porn'
);
```

## Détection Automatique du MIME Type

Les nouvelles fonctions incluent une détection automatique du type MIME basée sur les premiers bytes du fichier :

- JPEG : `image/jpeg`
- PNG : `image/png`
- GIF : `image/gif`
- WebP : `image/webp`
- Fallback : `image/jpeg`

## Gestion des Erreurs

Toutes les nouvelles méthodes incluent :
- Logging détaillé des opérations
- Gestion gracieuse des erreurs d'upload d'images
- Mise à jour automatique des rate limits
- Continuation du traitement même si une image échoue

## Testing

### Commande de Test

Une nouvelle commande Ace est disponible pour tester les fonctions :

```bash
node ace test:bluesky:post
```

Pour tester avec du contenu NSFW :
```bash
TEST_NSFW=true node ace test:bluesky:post
```

### Fonctions Utilitaires de Test

```typescript
import { quickNSFWTest, quickSafeTest } from '#services/bluesky_post_examples'

// Test rapide NSFW
await quickNSFWTest(1, 'images/test.jpg', 'Message test NSFW')

// Test rapide safe
await quickSafeTest(1, ['images/photo1.jpg'], 'Message test safe')
```

## Exemples Complets

Voir le fichier `app/services/bluesky_post_examples.ts` pour des exemples d'utilisation détaillés.

## Migration

### Ancien Code
```typescript
await accountService.post(account, message, images, altTexts, contentWarnings)
```

### Nouveau Code (Recommandé)
```typescript
// Pour contenu safe
await accountService.postSafeContent(account, message, postImages)

// Pour contenu NSFW
await accountService.postNSFWContent(account, message, postImages, 'porn')

// Pour contrôle total
await accountService.createPostWithMedia(account, {
  text: message,
  images: postImages,
  labels: ['sexual', 'graphic-media']
})
```

## Avantages des Nouvelles Fonctions

1. **API plus claire** : Séparation entre contenu safe et NSFW
2. **Meilleure gestion des images** : Support direct des Buffer
3. **Labels multiples** : Support de plusieurs content warnings
4. **Détection MIME automatique** : Plus de robustesse
5. **Rétrocompatibilité** : L'ancien code continue de fonctionner
6. **Logging amélioré** : Meilleur debugging
7. **Tests intégrés** : Commandes de test disponibles
