# Content Warnings System

## Vue d'ensemble

Le système de Content Warnings permet aux utilisateurs d'ajouter des labels de contenu sensible à leurs posts avec médias sur Bluesky.

## Types de Warnings Supportés

| Type | Label Backend | Description | Icône | Couleur |
|------|---------------|-------------|-------|---------|
| **Sexual** | `sexual` | Contenu sexuel ou suggestif | 🔥 Flame | Orange |
| **Nudity** | `nudity` | Contient de la nudité | 👁️ Eye | Rose |
| **Adult** | `porn` | Contenu adulte/pornographique | ⚠️ Alert | Rouge |
| **Graphic** | `graphic-media` | Imagerie graphique ou dérangeante | 🛡️ Shield | Violet |
| **Gore** | `gore` | Sang, violence ou gore | 💧 Droplet | Rose foncé |

## Architecture

### Frontend
- **`ContentWarningSelector.tsx`** : Composant de sélection avec chips interactives
- Intégré directement dans `CreateScheduleModal`
- S'affiche uniquement quand des médias (images/vidéos) sont ajoutés
- Interface minimaliste avec feedback visuel

### Backend
- **Model** : `Scheduling.contentWarnings` (JSON string array)
- **Controller** : `SchedulingsController.extractMediaFromRequest()` parse le champ `content_warnings`
- **Service** : `AccountService.createPostWithMedia()` applique les labels au post Bluesky
- **Format Bluesky** : Envoyé comme `com.atproto.label.defs#selfLabels`

## Mapping Backend

Le backend mappe automatiquement certains alias vers les types standard :
```typescript
'adult' → 'porn'
'suggestive' → 'sexual'
'graphic_media' → 'graphic-media'
```

## Utilisation

### Dans le code
```tsx
<ContentWarningSelector
  selected={contentWarnings}
  onChange={(warnings) => setContentWarnings(warnings)}
/>
```

### Flow utilisateur
1. L'utilisateur ajoute une image ou vidéo
2. La section Content Warnings apparaît automatiquement
3. L'utilisateur clique sur les chips pour activer/désactiver les warnings
4. Les warnings sélectionnés sont sauvegardés dans le Scheduling
5. Au moment de poster, les labels sont appliqués au post Bluesky

## Format de stockage

### Dans la base de données
```json
["sexual", "nudity"]
```

### Envoyé à Bluesky
```json
{
  "labels": {
    "$type": "com.atproto.label.defs#selfLabels",
    "values": [
      { "val": "sexual" },
      { "val": "nudity" }
    ]
  }
}
```

## Notes techniques

- Les content warnings ne sont disponibles **que pour les posts avec médias**
- Twitter ne supporte pas les content warnings (limitation API)
- Les utilisateurs Bluesky peuvent filtrer le contenu basé sur ces labels
- Les labels sont optionnels mais recommandés pour le contenu sensible
