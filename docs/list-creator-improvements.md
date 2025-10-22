# List Creator - Améliorations Récentes

## Problèmes Résolus

### 1. ✅ Search More avec CURSOR de pagination Bluesky
**Problème:** Les boutons "Search More" et "Search More 5x" refaisaient la même recherche avec les mêmes paramètres, retournant les mêmes 282 profils à chaque fois (pas de pagination).

**Solution FINALE:**
- Utilise le **cursor de pagination** fourni par l'API Bluesky `searchActors()`
- Le backend accepte `cursor` (objet avec un cursor par keyword) et `existing_handles` (array)
- Envoie les `existing_handles` pour éviter les doublons côté serveur
- Retourne le nouveau `cursor` dans `meta.cursors` pour la prochaine page
- Frontend stocke les cursors dans le state et les envoie lors du "Search More"

**Code:**
```typescript
// Frontend: Stocke et envoie les cursors
const [cursors, setCursors] = useState<Record<string, string | null>>({})

const handleSearch = async (isLoadMore = false, customLimit?: number) => {
  const response = await axios.post('/api/list-creator/search', {
    keywords,
    cursor: isLoadMore ? cursors : undefined,
    existing_handles: isLoadMore ? results.map(r => r.username) : undefined,
    relationship_filter: relationshipFilter !== 'all' ? relationshipFilter : undefined,
  })
  
  setCursors(response.data.meta.cursors) // Sauvegarde les cursors
}

// Backend: Utilise le cursor de pagination
for (const keyword of keywords) {
  const response = await agent.searchActors({
    term: keyword,
    limit: 100,
    cursor: parsedCursor?.[keyword] || undefined, // Reprend là où on s'était arrêté
  })
  
  cursors[keyword] = response.data.cursor || null
}
```

### 2. ✅ Progress Bar RÉELLE avec SSE pour la sauvegarde de liste
**Problème:** La sauvegarde de liste prenait beaucoup de temps (ajout de 50 membres via API Bluesky) sans feedback visuel. L'ancienne solution utilisait une fake progress bar avec `setInterval`.

**Solution FINALE:**
- Endpoint SSE: `/api/list-creator/save-list-stream` (POST)
- Utilise `text/event-stream` pour envoyer des updates en temps réel
- Progress bar mise à jour au fur et à mesure de l'ajout réel des membres
- Messages détaillés à chaque étape:
  - 10%: "Creating list on Bluesky..."
  - 20%: "List created, saving to database..."
  - 30-90%: "Added X/Y members..."
  - 100%: "Complete"

**Fonctionnalités:**
- **Vraie progress** basée sur l'ajout réel des membres (pas de fake timer)
- Progress bar avec pourcentage visible et message descriptif
- Boutons désactivés pendant la sauvegarde
- Fermeture automatique après succès
- Utilise `fetch` avec `ReadableStream` (pas EventSource car POST requis)

**Code:**
```typescript
// Frontend: Parse SSE avec ReadableStream
const response = await fetch('/api/list-creator/save-list-stream', {
  method: 'POST',
  body: JSON.stringify({ name, description, profiles }),
})

const reader = response.body!.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n\n')
  
  for (const line of lines.slice(0, -1)) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6))
      setSaveProgress(data.progress)
      setSaveStatus(data.message)
    }
  }
}

// Backend: Envoie des events SSE
response.response.write(`data: ${JSON.stringify({ progress: 30, message: 'Added 10/50 members...' })}\n\n`)
```

### 3. ✅ Filtre de Matching Score (Pourcentage)
**Problème:** Les résultats incluaient tous les profils, même ceux avec un faible score de matching (ex: 20%).

**Solution:**
- Ajout d'un champ "Min Matching (%)" dans la configuration de recherche
- Filtre côté frontend basé sur le cosine similarity score
- Les profils en dessous du seuil sont exclus des résultats
- Valeurs: 0-100% (0 = tous les profils, 100 = matching parfait uniquement)

**Interface:**
- Grid 2 colonnes: "Profile Limit" + "Min Matching (%)"
- Placeholder: "0" (pas de filtre par défaut)
- Tooltip: "Filter profiles by minimum matching score (0-100%)"

**Code:**
```typescript
const minScore = parseFloat(minMatchScore) / 100
const filteredResults = data.data.filter((r: ProfileResult) => r.score >= minScore)
```

### 4. ✅ Filtre par Relation (Following Status)
**Problème:** Impossible de filtrer les profils selon la relation avec l'utilisateur (following, followers, etc.).

**Solution:**
- Ajout d'un dropdown "Relationship Filter" avec 5 options:
  - **All profiles**: Tous les profils
  - **Not following**: Seulement ceux que tu ne suis pas encore
  - **Following**: Seulement ceux que tu suis déjà
  - **Mutual follows**: Follows mutuels (tu les suis ET ils te suivent)
  - **They follow me**: Seulement ceux qui te suivent
- Utilise l'API Bluesky `app.bsky.graph.getRelationships()` (limite: 30 DIDs par appel)
- Traitement par batches de 30 profils côté backend
- Ajoute `following` et `followedBy` à chaque profil

**Interface:**
- Dropdown sous "Min Matching (%)"
- Icône Users devant le label
- Applique le filtre côté serveur AVANT le scoring

**Code:**
```typescript
// Frontend
<Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
  <SelectItem value="all">All profiles</SelectItem>
  <SelectItem value="not_following">Not following</SelectItem>
  <SelectItem value="following">Following</SelectItem>
  <SelectItem value="mutual">Mutual follows</SelectItem>
  <SelectItem value="followed_by">They follow me</SelectItem>
</Select>

// Backend: Récupère les relations par batches
const allDids = uniqueProfiles.map(p => p.did)
for (let i = 0; i < allDids.length; i += 30) {
  const batch = allDids.slice(i, i + 30)
  const { data } = await agent.app.bsky.graph.getRelationships({
    actor: account.did!,
    others: batch,
  })
  
  for (const rel of data.relationships) {
    const profile = uniqueProfiles.find(p => p.did === rel.did)
    if (profile) {
      profile.following = rel.following || null
      profile.followedBy = rel.followedBy || null
    }
  }
}

// Applique le filtre
if (relationshipFilter === 'not_following') {
  uniqueProfiles = uniqueProfiles.filter(p => !p.following)
} else if (relationshipFilter === 'following') {
  uniqueProfiles = uniqueProfiles.filter(p => p.following)
} else if (relationshipFilter === 'mutual') {
  uniqueProfiles = uniqueProfiles.filter(p => p.following && p.followedBy)
} else if (relationshipFilter === 'followed_by') {
  uniqueProfiles = uniqueProfiles.filter(p => p.followedBy)
}
```

## Comportement Amélioré

### Recherche Standard
1. L'utilisateur entre des mots-clés: "marketing, SaaS, growth"
2. Le backend cherche chaque mot-clé séparément sur Bluesky
3. Les profils sont dédupliqués et scorés par cosine similarity
4. Filtre appliqué selon le "Min Matching (%)"
5. Résultats affichés triés par score décroissant

### Search More
1. Clic sur "Search More": Recherche avec `limit = 50 * 1 = 50` nouveaux profils
2. Clic sur "Search More 5x": Recherche avec `limit = 50 * 5 = 250` nouveaux profils
3. Les nouveaux profils sont ajoutés aux résultats existants (sans doublons)
4. Le score minimum est réappliqué sur les nouveaux profils

### Sauvegarde de Liste
1. Clic sur "Save as Bluesky List"
2. Modal s'ouvre avec champs: Nom, Description
3. Clic sur "Create List"
4. Progress bar démarre: 0% → 10% → 20% → ... → 90%
5. Le backend crée la liste sur Bluesky et ajoute les membres
6. Progress bar passe à 100%
7. Modal se ferme avec message de succès
8. La nouvelle liste apparaît en bas de la page

## Exemples d'Utilisation

### Cas 1: Trouver des marketeurs SaaS de qualité
```
Keywords: marketing, SaaS, growth
Limit: 50
Min Matching: 60%

Résultat: 15 profils avec >60% de matching
```

### Cas 2: Construire une grande liste d'indie hackers
```
Keywords: indie hacker, bootstrapped, solo founder
Limit: 50
Min Matching: 40%

Action: Clic sur "Search More 5x"
Résultat: 150 profils uniques avec >40% de matching
```

### Cas 3: Liste ultra-ciblée d'experts AI
```
Keywords: AI, machine learning, LLM
Limit: 100
Min Matching: 80%

Résultat: 8 profils hautement pertinents
Sauvegarde: Liste "AI Experts" avec 8 membres
```

## Performance

### Avant
- Search More: Retournait les mêmes 282 profils
- Sauvegarde: Pas de feedback pendant 30-60 secondes
- Filtrage: Tous les profils affichés (même score 0.15)

### Après
- Search More: Ajoute de nouveaux profils uniques
- Sauvegarde: Progress bar animée toutes les 500ms
- Filtrage: Seulement les profils au-dessus du seuil

## Notes Techniques

### Rate Limiting
- Bluesky API: 100 profils max par requête
- Ajout de membres à la liste: 100ms de délai entre chaque
- Follow All: 1 seconde de délai entre chaque follow

### Déduplication
Les doublons sont évités via:
```typescript
const existingHandles = new Set(results.map(r => r.username))
const newResults = filteredResults.filter(r => !existingHandles.has(r.username))
```

### Score Matching
Le score est calculé par cosine similarity (0-1):
- 0.00-0.30: Faible matching (0-30%)
- 0.30-0.60: Matching moyen (30-60%)
- 0.60-0.80: Bon matching (60-80%)
- 0.80-1.00: Excellent matching (80-100%)
