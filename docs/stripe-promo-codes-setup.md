# Configuration des Codes Promo Stripe

## 🎯 Fonctionnement Standard

Avec `allow_promotion_codes: true`, les utilisateurs peuvent saisir des codes promo directement dans l'interface de checkout Stripe.

## 📝 Configuration dans le Dashboard Stripe

### 1. Créer les Coupons dans Stripe Dashboard

Allez dans **Products > Coupons** dans votre dashboard Stripe et créez :

#### **TEST50** - Gratuit
- **Type** : Percentage
- **Percentage off** : 100%
- **Duration** : Once
- **Max redemptions** : 100
- **Redeem by** : 31/12/2025

#### **LAUNCH100** - Gratuit (Pro seulement)
- **Type** : Percentage  
- **Percentage off** : 100%
- **Duration** : Once
- **Max redemptions** : 50
- **Redeem by** : 30/09/2025

#### **BUSINESS20** - 20% de réduction
- **Type** : Percentage
- **Percentage off** : 20%
- **Duration** : Once
- **Max redemptions** : 200
- **Redeem by** : 31/12/2025

#### **EARLYBIRD** - 75% de réduction
- **Type** : Percentage
- **Percentage off** : 75%
- **Duration** : Once
- **Max redemptions** : 25
- **Redeem by** : 31/10/2025

### 2. Créer les Promotion Codes

Pour chaque coupon, créez un **Promotion Code** :

1. Allez dans **Products > Promotion codes**
2. Cliquez sur **+ New**
3. Sélectionnez le coupon correspondant
4. **Code** : Utilisez le même nom (TEST50, LAUNCH100, etc.)
5. **Active** : Activé
6. **Max redemptions** : Même valeur que le coupon
7. **Expires at** : Même date que le coupon

## 🔧 Alternative : Script d'Auto-création

Vous pouvez aussi créer un script pour automatiser la création :

```typescript
// commands/create_stripe_promos.ts
import { BaseCommand } from '@adonisjs/core/ace'
import { Stripe } from 'stripe'

export default class CreateStripePromos extends BaseCommand {
  static commandName = 'stripe:create-promos'
  static description = 'Create promotion codes in Stripe'

  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  async run() {
    const promoCodes = [
      {
        id: 'test50',
        percent_off: 100,
        duration: 'once',
        max_redemptions: 100,
        redeem_by: Math.floor(new Date('2025-12-31').getTime() / 1000),
        name: 'TEST50 - Gratuit'
      },
      {
        id: 'launch100',
        percent_off: 100,
        duration: 'once',
        max_redemptions: 50,
        redeem_by: Math.floor(new Date('2025-09-30').getTime() / 1000),
        name: 'LAUNCH100 - Gratuit Pro'
      },
      {
        id: 'business20',
        percent_off: 20,
        duration: 'once',
        max_redemptions: 200,
        redeem_by: Math.floor(new Date('2025-12-31').getTime() / 1000),
        name: 'BUSINESS20 - 20% Off'
      },
      {
        id: 'earlybird',
        percent_off: 75,
        duration: 'once',
        max_redemptions: 25,
        redeem_by: Math.floor(new Date('2025-10-31').getTime() / 1000),
        name: 'EARLYBIRD - 75% Off'
      }
    ]

    for (const promoData of promoCodes) {
      try {
        // Créer le coupon
        const coupon = await this.stripe.coupons.create(promoData)
        this.logger.info(`✅ Coupon créé: ${coupon.id}`)

        // Créer le promotion code
        const promotionCode = await this.stripe.promotionCodes.create({
          coupon: coupon.id,
          code: promoData.id.toUpperCase(),
          active: true,
          max_redemptions: promoData.max_redemptions
        })
        this.logger.info(`✅ Promotion code créé: ${promotionCode.code}`)

      } catch (error: any) {
        if (error.code === 'resource_already_exists') {
          this.logger.info(`⚠️  ${promoData.id} existe déjà`)
        } else {
          this.logger.error(`❌ Erreur pour ${promoData.id}:`, error.message)
        }
      }
    }
  }
}
```

## 🚀 Test des Codes

Une fois configurés dans Stripe, les codes fonctionneront automatiquement :

1. **Accéder au checkout** : `GET /stripe/checkout/pro`
2. **Saisir le code** : Dans le champ "Promotion code" de Stripe
3. **Validation automatique** : Stripe valide et applique la réduction

## ✅ Avantages de cette Approche

- ✅ **Interface native** : Champ de saisie intégré à Stripe
- ✅ **Validation en temps réel** : Stripe vérifie instantanément
- ✅ **Gestion centralisée** : Tout dans le dashboard Stripe
- ✅ **Analytics incluses** : Statistiques d'utilisation automatiques
- ✅ **Pas de conflit** : Plus de problème avec `allow_promotion_codes` vs `discounts`

## 🔄 Migration

Votre `PromoCodeService` peut maintenant servir uniquement pour :
- La documentation des codes disponibles
- Les validations côté client (optionnel)
- L'affichage des réductions sur la page pricing
