# Plan de Refactoring - Implémentation Rich Text Bluesky

## Vue d'ensemble du problème

Actuellement, notre plateforme ne gère pas correctement les fonctionnalités rich text de Bluesky (liens, hashtags, mentions). Les posts programmés et les campagnes DM ne génèrent pas les `facets` requis, ce qui fait que les liens et hashtags n'apparaissent pas comme cliquables sur Bluesky.

## Compréhension technique des Rich Text Facets

### Structure des Facets Bluesky
- **Facets** : Métadonnées qui définissent les décorations de texte (liens, mentions, hashtags)
- **Index** : Position dans le texte avec `byteStart` et `byteEnd` (UTF-8 byte offsets)
- **Features** : Type de décoration (`link`, `mention`, `tag`)

### Types de Facets supportés
1. **Links** (`app.bsky.richtext.facet#link`) - Avec attribut `uri`
2. **Mentions** (`app.bsky.richtext.facet#mention`) - Avec attribut `did`
3. **Hashtags** (`app.bsky.richtext.facet#tag`) - Avec attribut `tag`

### Contraintes importantes
- Indexation en UTF-8 byte offsets (pas de `.slice()` JavaScript standard)
- Facets ne peuvent pas se chevaucher
- byteEnd est exclusif (comme `slice()`)

## Plan de refactoring

### Phase 1 : Infrastructure Core

#### 1.1 Création du service RichText
**Fichier** : `app/services/rich_text_service.ts`

**Responsabilités** :
- Parser le texte pour détecter hashtags (#) et mentions (@)
- Gérer l'encodage UTF-8 et les byte offsets
- Générer les facets appropriés
- Valider les domaines pour les mentions
- Résoudre les DIDs pour les mentions

**Méthodes principales** :
- `parseText(text: string, explicitLinks?: ExplicitLink[]): { text: string, facets: Facet[] }`
- `detectHashtags(text: string): Facet[]`
- `detectMentions(text: string): Facet[]`
- `processExplicitLinks(text: string, links: ExplicitLink[]): Facet[]`
- `utf16IndexToUtf8Index(text: string, index: number): number`
- `resolveMentionDid(handle: string): Promise<string>`

#### 1.2 Types TypeScript
**Fichier** : `types/rich_text.ts`

**Interfaces** :
```typescript
interface ExplicitLink {
  text: string // Texte à transformer en lien
  url: string  // URL de destination
}

interface RichTextFacet {
  index: {
    byteStart: number
    byteEnd: number
  }
  features: Array<{
    $type: 'app.bsky.richtext.facet#link' | 'app.bsky.richtext.facet#mention' | 'app.bsky.richtext.facet#tag'
    uri?: string    // Pour les liens
    did?: string    // Pour les mentions
    tag?: string    // Pour les hashtags
  }>
}

interface ParsedRichText {
  text: string
  facets: RichTextFacet[]
}
```

### Phase 2 : Refactoring du système de Scheduling

#### 2.1 Frontend - Interface utilisateur pour liens explicites

**Fichier** : `inertia/components/AddScheduleModal.tsx`

**Modifications** :
- Ajouter un état pour gérer les liens explicites
- Interface pour sélectionner du texte et le convertir en lien
- Bouton "Ajouter un lien" avec modal de saisie URL
- Prévisualisation des liens dans le texte
- Validation des URLs

**Nouvelles fonctionnalités** :
- Sélection de texte avec popup "Convertir en lien"
- Liste des liens déclarés avec possibilité de modification/suppression
- Prévisualisation du texte avec liens colorés/stylés

**Fichier** : `inertia/pages/schedule.tsx`

**Modifications** :
- Intégrer le support des liens explicites dans l'édition des posts
- Mise à jour de l'interface de modification pour inclure la gestion des liens

#### 2.2 Backend - Traitement des rich text

**Fichier** : `app/controllers/schedulings_controller.ts`

**Modifications** :
- Intégrer le `RichTextService` dans `schedulePost()`
- Parser le message avec les liens explicites fournis par le frontend
- Stocker les facets dans la base de données
- Mettre à jour la validation pour inclure la structure des liens

**Nouvelles méthodes** :
```typescript
private async processRichText(message: string, explicitLinks: ExplicitLink[]): Promise<ParsedRichText>
private async validateExplicitLinks(links: ExplicitLink[]): Promise<boolean>
```

**Fichier** : `app/jobs/schedule_job.ts`

**Modifications majeures** :
- Utiliser les facets stockés lors de la publication sur Bluesky
- Adapter l'appel à l'API Bluesky pour inclure les facets
- Gérer différemment Twitter (pas de support rich text)

**Logique de publication** :
```typescript
// Pour Bluesky
if (platform === 'bluesky') {
  const postData = {
    text: schedule.message,
    facets: schedule.facets ? JSON.parse(schedule.facets) : undefined,
    // ... autres données média
  }
  await agent.post(postData)
}

// Pour Twitter - texte simple seulement
if (platform === 'twitter') {
  // Pas de facets, utiliser le texte brut
}
```

#### 2.3 Base de données

**Migration** : Ajouter colonne `facets` à la table `schedulings`
```sql
ALTER TABLE schedulings ADD COLUMN facets TEXT;
```

### Phase 3 : Refactoring des DM Campaigns

#### 3.1 Frontend - Campagnes DM avec rich text

**Fichier** : `inertia/pages/AddAICampaign.tsx`

**Modifications** :
- Ajouter support des liens explicites dans le champ message
- Interface pour déclarer des liens dans les messages de campagne
- Prévisualisation du message avec rich text

**Fichier** : `inertia/pages/CampaignDashboard.tsx`

**Modifications** :
- Mettre à jour la modal d'édition des paramètres pour inclure la gestion des liens
- Support de l'édition des messages existants avec leurs liens
- Prévisualisation des messages avec rich text dans les statistiques

#### 3.2 Backend - Traitement des campagnes DM

**Fichier** : `app/controllers/dm_campaigns_controller.ts`

**Modifications importantes** :
- Intégrer `RichTextService` dans `createDmCampaign()`
- Parser tous les messages de campagne avec rich text
- Stocker les facets pour chaque message
- Mettre à jour `updateCampaign()` pour gérer les changements de liens

**Fichier** : `app/services/campaign_message_service.ts`

**Modifications** :
- Ajouter le traitement rich text lors de l'envoi des messages
- Utiliser les facets stockés pour les messages DM sur Bluesky

#### 3.3 Base de données

**Migrations** :
```sql
-- Table dm_campaigns
ALTER TABLE dm_campaigns ADD COLUMN message_facets TEXT;

-- Table campaign_messages (si elle existe)
ALTER TABLE campaign_messages ADD COLUMN facets TEXT;
```

### Phase 4 : Gestion avancée et UX

#### 4.1 Composants Frontend réutilisables

**Fichier** : `inertia/components/RichTextEditor.tsx`

**Fonctionnalités** :
- Éditeur de texte avec support rich text
- Détection automatique des hashtags et mentions (visuellement)
- Interface de gestion des liens explicites
- Prévisualisation en temps réel
- Validation des URLs et handles

**Fichier** : `inertia/components/LinkManager.tsx`

**Fonctionnalités** :
- Modal pour ajouter/modifier des liens
- Liste des liens déclarés
- Validation des URLs
- Aperçu du texte transformé

#### 4.2 Services Backend avancés

**Fichier** : `app/services/mention_resolver_service.ts`

**Responsabilités** :
- Résoudre les handles Bluesky en DIDs
- Cache des résolutions pour performance
- Validation des handles existants
- Gestion des erreurs de résolution

**Fichier** : `app/services/rich_text_validator_service.ts`

**Responsabilités** :
- Valider la structure des facets
- Vérifier les chevauchements
- Valider les byte offsets
- Nettoyer les hashtags invalides

### Phase 5 : Tests et Migration

#### 5.1 Tests unitaires
- Tests du `RichTextService` avec différents cas d'usage
- Tests d'encodage UTF-8 et byte offsets
- Tests de détection hashtags/mentions
- Tests de validation des liens

#### 5.2 Migration des données existantes
- Script de migration pour analyser les posts/messages existants
- Génération rétroactive des facets pour les hashtags/mentions
- Validation de l'intégrité des données migrées

#### 5.3 Tests d'intégration
- Tests end-to-end du flow de scheduling avec rich text
- Tests des campagnes DM avec liens
- Validation sur Bluesky en environnement de test

## Ordre d'implémentation recommandé

1. **Infrastructure** : RichTextService + types TypeScript
2. **Scheduling Backend** : Intégration dans controllers et jobs
3. **Scheduling Frontend** : Interface utilisateur pour liens
4. **DM Campaigns Backend** : Intégration dans les controllers de campagne
5. **DM Campaigns Frontend** : Interface utilisateur pour les campagnes
6. **Composants réutilisables** : RichTextEditor et LinkManager
7. **Tests et migration** : Validation complète du système

## Avantages de cette approche

1. **Séparation des responsabilités** : Service dédié pour rich text
2. **Réutilisabilité** : Même service pour scheduling et DM campaigns
3. **UX intuitive** : Liens explicites plutôt que markdown/HTML
4. **Compatibilité** : Gestion différentielle Bluesky vs Twitter
5. **Évolutivité** : Base solide pour futures fonctionnalités rich text

## Considérations techniques importantes

1. **UTF-8 Encoding** : Utilisation correcte des byte offsets
2. **Performance** : Cache pour la résolution des DIDs
3. **Validation** : Vérification stricte des URLs et handles
4. **Erreur Handling** : Graceful degradation si rich text échoue
5. **Backward Compatibility** : Support des posts existants sans facets
