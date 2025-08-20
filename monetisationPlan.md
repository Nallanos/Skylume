# Guide de Monétisation avec Stripe - Bluesky Copilot

## Vue d'ensemble

Ce guide explique comment implémenter et supporter le système de paiement Stripe avec les plans **Pro** (10€) et **Business** (19€) pour Bluesky Copilot.

## Architecture des Plans

### Plans Disponibles

1. **Freemium (Gratuit)**
   - 7 posts programmés maximum
   - 2 comptes maximum (Bluesky + Twitter)
   - 2 feeds maximum
   - 5 chargements de followers par mois
   - 200 actions de follow par jour
   - Campagnes DM : non disponibles

2. **Pro (10€/mois)**
   - Posts programmés : illimités
   - Comptes : illimités (Bluesky + Twitter)
   - Feeds : illimités
   - Chargements de followers : illimités
   - Actions de follow : illimitées
   - Campagnes DM : création seulement
   - Stripe Price ID : `price_1RwUv1DBUZYEtnf3KoULFohK`

3. **Business (19€/mois)**
   - Toutes les fonctionnalités Pro
   - Exécution des campagnes DM : disponible
   - Stripe Price ID : `price_1RwUvYDBUZYEtnf3ZFlNL7a5`

## Configuration Stripe

### Variables d'environnement (.env)

```properties
# Stripe Configuration (Production)
STRIPE_PUBLIC_KEY=pk_live_51QUCuEDBUZYEtnf3QM28XZpJhzAy4aHU8viWLBpBF2047gG6KBTz5iFbznsMHlFGyaQtEMUKOPGJ1phF2zyTWsY200O76Y0M9a
STRIPE_SECRET_KEY=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
STRIPE_WEBHOOK_SECRET=whsec_KvWRGr3ZMJ8ikaJgofH9EXR5jBEzq30F

# Price IDs pour chaque plan
STRIPE_PRICE_ID=price_1RwUv1DBUZYEtnf3KoULFohK          # Plan Pro
STRIPE_PRICE_ID_BUSINESS=price_1RwUvYDBUZYEtnf3ZFlNL7a5  # Plan Business
```

### Webhook Stripe requis

L'endpoint webhook est configuré sur : `https://bluesky-bot.com/stripe/webhook`

**Événements à écouter :**
- `checkout.session.completed` - Nouveau paiement
- `customer.subscription.updated` - Modification d'abonnement  
- `customer.subscription.deleted` - Annulation d'abonnement

## Implémentation Étape par Étape

### Étape 1: Routes de Paiement

#### Routes publiques (visiteurs non connectés)
```typescript
// Checkout direct par plan (public)
router.get('/stripe/checkout/:plan', [stripe_controller, 'redirectToStripe'])
```

#### Routes authentifiées
```typescript
// Session Stripe pour utilisateurs connectés
router.post('/create-stripe-session', [stripe_controller, 'redirectToStripe']).use(middleware.auth())

// Gestion des abonnements
router.post('/downgrade-plan', [stripe_controller, 'downgradePlan']).use(middleware.auth())

// Webhook Stripe (public, sécurisé par signature)
router.post('/stripe/webhook', [stripe_controller, 'getPaymentSucceeded'])
```

### Étape 2: Contrôleur Stripe (StripeController)

#### Méthode `redirectToStripe`
**Fonctionnalité :**
- Crée une session Stripe Checkout
- Support utilisateurs connectés ET visiteurs anonymes
- Gestion des métadonnées pour lier l'achat à l'utilisateur

**Paramètres acceptés :**
- `plan` : 'pro' ou 'business'

**Logique :**
1. Valide que le plan existe
2. Récupère l'utilisateur actuel (si connecté)
3. Crée la session avec métadonnées appropriées
4. Redirige vers Stripe Checkout

#### Méthode `getPaymentSucceeded` (Webhook)
**Gère 3 événements :**

1. **`checkout.session.completed`**
   - Créé un nouvel utilisateur si nécessaire (email du checkout)
   - Met à jour le plan de l'utilisateur existant
   - Stocke l'ID de subscription

2. **`customer.subscription.updated`**
   - Met à jour le plan selon les métadonnées

3. **`customer.subscription.deleted`**
   - Rétrograde l'utilisateur au plan gratuit
   - Supprime l'ID de subscription

### Étape 3: Middleware de Limitation de Plan

#### Fonctionnalités protégées
- `scheduling` - Posts programmés
- `accounts` - Création de comptes (Bluesky + Twitter)
- `feeds` - Gestion des feeds et hashtag groups
- `followerLoading` - Analyse des followers
- `followActions` - Actions de follow/unfollow
- `dmCampaigns` - Campagnes de messages directs

#### Routes protégées principales
```typescript
// Comptes Twitter et Bluesky
PUT /account - Création compte Bluesky
GET /auth/twitter - Connexion Twitter
GET /auth/twitter/callback - Callback Twitter

// Feeds et groupes de hashtags
POST /feed/create - Création de feeds
POST /hashtag-groups - Gestion hashtags

// Analyses
POST /api/accounts/:id/follower-analysis/start - Analyse followers

// Actions de follow
POST /accounts/:id/follower-tracker/batch-follow
POST /accounts/:id/follower-tracker/batch-unfollow

// Campagnes DM
POST /campaign/create - Création campagnes
POST /campaign/:id/execute - Exécution campagnes

// Planification
POST /schedule/create - Posts programmés
```

### Étape 4: Service de Suivi d'Usage (UsageTrackingService)

#### Comptage unifié des comptes
Le service compte **Bluesky + Twitter** pour la limite de comptes :

```typescript
// Compter les comptes (Bluesky + Twitter)
const blueskyAccountsCount = user.account?.length || 0
const twitterAccountsCount = user.twitterAccounts?.length || 0
const accountsCount = blueskyAccountsCount + twitterAccountsCount
```

#### Métriques suivies
- Posts programmés actuels vs limite
- Comptes totaux (Bluesky + Twitter) vs limite
- Feeds totaux vs limite
- Chargements de followers ce mois vs limite
- Actions de follow aujourd'hui vs limite

### Étape 5: Interface Utilisateur

#### Page Pricing (`/pricing`)
- Affiche les 3 plans avec tarifs
- Boutons "Upgrade" redirigent vers `/stripe/checkout/{plan}`
- Support visiteurs non connectés

#### Indication des limites
- Barre de progression pour chaque métrique
- Alertes quand on approche des limites (80%+)
- CTA pour upgrade avec plan recommandé

#### Dashboard utilisateur
- Affichage du plan actuel
- Statistiques d'utilisation en temps réel
- Bouton de downgrade (pour abonnés payants)

## Flux Utilisateur

### 1. Visiteur anonyme
```
Visite /pricing → Clique "Upgrade Pro" → /stripe/checkout/pro
→ Stripe Checkout → Paiement → Webhook crée compte → Redirection /dashboard
```

### 2. Utilisateur connecté gratuit
```
Dashboard → Alerte limite → Clique "Upgrade" → /stripe/checkout/pro
→ Stripe Checkout → Paiement → Webhook met à jour plan → /dashboard?upgraded=true
```

### 3. Utilisateur Pro → Business
```
Profile → "Upgrade to Business" → /stripe/checkout/business
→ Stripe gère automatiquement la proration → Webhook met à jour plan
```

### 4. Downgrade
```
Profile → "Downgrade to Free" → Confirmation → API Stripe cancel subscription
→ Webhook reçoit subscription.deleted → Plan = "free"
```

## Sécurité et Validation

### Webhook Stripe
- Vérification signature avec `STRIPE_WEBHOOK_SECRET`
- Validation des événements requis uniquement
- Gestion d'erreurs et logging

### Métadonnées Session
```typescript
metadata: {
  plan: 'pro|business',
  user_id: 'uuid-si-connecté'
}
```

### Limitation Backend
- Middleware vérifie les limites avant chaque action
- Double vérification côté serveur (pas seulement frontend)
- Redirection automatique vers pricing si limite atteinte

## Gestion des Erreurs

### Cas d'échec courants
1. **Webhook manqué** : L'utilisateur paie mais le plan n'est pas mis à jour
   - Solution : Vérification manuelle via dashboard Stripe

2. **Utilisateur non trouvé** : Email webhook différent du compte
   - Solution : Recherche par email, création si nécessaire

3. **Plan inexistant** : Mauvais paramètre de plan
   - Solution : Redirection vers /pricing avec erreur

4. **Subscription orpheline** : Subscription sans utilisateur associé
   - Solution : Logging pour investigation manuelle

## Monitoring et Métriques

### À surveiller
- Taux de conversion visiteur → payant
- Taux d'upgrade gratuit → Pro
- Taux d'upgrade Pro → Business  
- Taux de churn (downgrades)
- Revenus récurrents mensuels (MRR)

### Logs importants
- Toutes les transactions webhook
- Échecs de création de compte
- Tentatives d'accès aux fonctionnalités limitées
- Downgrades et leurs raisons

## Tests Recommandés

### Tests de paiement
1. **Stripe Test Mode** : Utiliser les clés de test pour validation
2. **Cartes de test** : `4242 4242 4242 4242` pour succès
3. **Webhooks test** : Utiliser Stripe CLI pour simulation

### Scénarios à tester
- [ ] Visiteur anonyme achète Pro
- [ ] Utilisateur gratuit upgrade vers Business
- [ ] Utilisateur Pro upgrade vers Business (proration)
- [ ] Downgrade Business → Free
- [ ] Webhook manqué (test de réconciliation)
- [ ] Limits enforcement après upgrade immédiat
- [ ] Plusieurs comptes Twitter + Bluesky (test limite)

## URLs Importantes

- **Checkout Pro** : `https://bluesky-bot.com/stripe/checkout/pro`
- **Checkout Business** : `https://bluesky-bot.com/stripe/checkout/business`
- **Pricing Page** : `https://bluesky-bot.com/pricing`
- **Webhook Endpoint** : `https://bluesky-bot.com/stripe/webhook`
- **Success Redirect** : `https://bluesky-bot.com/dashboard?upgraded=true&plan={plan}`
- **Cancel Redirect** : `https://bluesky-bot.com/pricing`

---

**Note :** Ce système est en production avec des clés Stripe live. Toute modification doit être testée en mode test avant déploiement.
