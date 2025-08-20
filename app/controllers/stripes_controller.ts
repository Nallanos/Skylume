import type { HttpContext } from '@adonisjs/core/http'
import { Stripe } from "stripe"
import User from '#models/user'
import { PlanService } from '#services/plan_service'
import { DateTime } from 'luxon'

export default class StripesController {
    private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    public async downgradePlan({ response, auth }: HttpContext) {
        const user = await auth.authenticate()
        if (!user) throw new Error("not auth")
        if (!user.subscriptionsId) throw new Error("user.subscriptionsId not defined")
        
        await this.stripe.subscriptions.cancel(user.subscriptionsId, { 
            invoice_now: true, 
            prorate: true 
        })
        
        user.plan = "free"
        user.planDowngradedAt = DateTime.now()
        user.subscriptionsId = undefined
        await user.save()
        
        return response.redirect("/dashboard")
    }

    public async cancelSubscription({ response, auth, session }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (!user) {
                session.flash('error', 'User not authenticated')
                return response.redirect('/profile')
            }

            if (!user.subscriptionsId) {
                session.flash('error', 'No active subscription found')
                return response.redirect('/profile')
            }

            console.log(`[STRIPE] Cancelling subscription: ${user.subscriptionsId} for user: ${user.id}`)
            
            // Annuler l'abonnement Stripe
            await this.stripe.subscriptions.cancel(user.subscriptionsId, {
                invoice_now: false, // Don't create invoice immediately
                prorate: true // Prorate the cancellation
            })

            // Mettre à jour l'utilisateur
            const oldPlan = user.plan
            user.plan = "free"
            user.planDowngradedAt = DateTime.now()
            user.subscriptionsId = undefined
            await user.save()

            console.log(`[STRIPE] ✅ Subscription cancelled successfully for user ${user.id}`)
            session.flash('success', `Your ${oldPlan} subscription has been cancelled. You'll continue to have access until the end of your billing period.`)
            
            return response.redirect('/profile')
        } catch (error: any) {
            console.error('[STRIPE] Error cancelling subscription:', error)
            session.flash('error', 'Failed to cancel subscription. Please try again or contact support.')
            return response.redirect('/profile')
        }
    }

    public async createCustomerPortal({ response, auth, session }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (!user) {
                session.flash('error', 'User not authenticated')
                return response.redirect('/profile')
            }

            if (!user.subscriptionsId) {
                session.flash('error', 'No active subscription found')
                return response.redirect('/profile')
            }

            // Get the subscription to find the customer ID
            const subscription = await this.stripe.subscriptions.retrieve(user.subscriptionsId)
            
            if (!subscription.customer) {
                session.flash('error', 'Customer information not found')
                return response.redirect('/profile')
            }

            // Create customer portal session
            const portalSession = await this.stripe.billingPortal.sessions.create({
                customer: subscription.customer as string,
                return_url: `${process.env.APP_URL}/profile`,
            })

            return response.redirect(portalSession.url)
        } catch (error: any) {
            console.error('[STRIPE] Error creating customer portal:', error)
            session.flash('error', 'Failed to access customer portal. Please try again.')
            return response.redirect('/profile')
        }
    }

    public async redirectToStripe({ response, auth, request }: HttpContext) {
        try {
            const requestedPlan = request.param('plan') || 'pro'
            
            console.log(`[STRIPE] Plan: ${requestedPlan}`)
            
            // Vérifier que le plan existe
            const planInfo = PlanService.getPlanInfo(requestedPlan)
            if (!planInfo || !planInfo.stripeProductId) {
                console.log(`[STRIPE] Invalid plan: ${requestedPlan}`)
                return response.redirect("/pricing")
            }

            // Métadonnées de session
            const user = await auth.authenticate()
            
            // Vérifier que l'utilisateur est authentifié
            if (!user) {
                console.error(`[STRIPE] ❌ No authenticated user found`)
                return response.redirect("/login")
            }
            
            const metadata: any = { 
                plan: requestedPlan,
                user_id: user.id
            }
            
            console.log(`[STRIPE] Authenticated user: ${user.id}`)
            console.log(`[STRIPE] Session metadata:`, JSON.stringify(metadata, null, 2))
            console.log(`[STRIPE] User email: ${user.email || 'No email set'}`)

            // Options de base pour la session Stripe
            const sessionOptions: any = {
                line_items: [{
                    price: planInfo.stripeProductId,
                    quantity: 1,
                }],
                mode: 'subscription',
                success_url: `http://localhost:8081/dashboard?upgraded=true&plan=${requestedPlan}`,
                cancel_url: `http://localhost:8081/pricing`,
                metadata,
                subscription_data: { metadata },
                billing_address_collection: 'auto',
                // Permettre l'utilisation de codes promo dans l'interface Stripe
                allow_promotion_codes: true
            }

            // Créer la session Stripe
            const session = await this.stripe.checkout.sessions.create(sessionOptions)
            
            if (!session.url) {
                console.error(`[STRIPE] No checkout URL returned`)
                return response.redirect("/pricing")
            }
            
            console.log(`[STRIPE] ✅ Session created successfully`)
            console.log(`[STRIPE] Session ID: ${session.id}`)
            console.log(`[STRIPE] Session metadata confirmed:`, JSON.stringify(session.metadata, null, 2))
            console.log(`[STRIPE] Redirecting to checkout: ${session.url}`)
            return response.redirect(session.url)
            
        } catch (error: any) {
            console.error(`[STRIPE] Checkout error:`, error.message || error)
            
            // Gestion d'erreurs spécifique selon les codes Stripe
            if (error.type === 'StripeInvalidRequestError') {
                console.error(`[STRIPE] Invalid request: ${error.message}`)
            }
            
            return response.redirect("/pricing?error=checkout_failed")
        }
    }

    public async getPaymentSucceeded({ request, response }: HttpContext) {
        console.log('[WEBHOOK] ================================')
        console.log('[WEBHOOK] Webhook received at:', new Date().toISOString())
        console.log('[WEBHOOK] Method:', request.method())
        console.log('[WEBHOOK] URL:', request.url())
        console.log('[WEBHOOK] Headers:', JSON.stringify(request.headers(), null, 2))
        
        const signature = request.header('stripe-signature')
        console.log('[WEBHOOK] Signature present:', !!signature)

        if (!signature) {
            console.log('[WEBHOOK] ❌ No Stripe signature provided')
            return response.status(400).json({ error: 'No signature provided' })
        }

        // Mode test : si la signature est "test_signature", on traite directement le JSON
        const isTestMode = signature === 'test_signature' && process.env.NODE_ENV === 'development'
        let event: any

        if (isTestMode) {
            console.log('[WEBHOOK] 🧪 TEST MODE: Bypassing signature verification')
            event = request.body()
            console.log(`[WEBHOOK] ✅ Test event: ${event.type}`)
            console.log(`[WEBHOOK] Event data keys:`, Object.keys(event.data.object))
        } else {
            try {
                // Pour les webhooks Stripe, on a besoin du body brut
                let rawBody: string | Buffer
                
                try {
                    rawBody = request.raw()!
                    console.log('[WEBHOOK] Raw body length:', rawBody.length)
                    console.log('[WEBHOOK] Raw body type:', typeof rawBody)
                    console.log('[WEBHOOK] Raw body first 100 chars:', rawBody.toString().substring(0, 100))
                } catch (bodyError) {
                    console.error('[WEBHOOK] ❌ Error getting raw body:', bodyError)
                    // Fallback: essayer de reconstruire le body depuis le JSON parsé
                    const bodyText = JSON.stringify(request.body())
                    rawBody = bodyText
                    console.log('[WEBHOOK] Using fallback body, length:', rawBody.length)
                }
                
                console.log('[WEBHOOK] Webhook secret configured:', !!process.env.STRIPE_WEBHOOK_SECRET)
                console.log('[WEBHOOK] Webhook secret length:', process.env.STRIPE_WEBHOOK_SECRET?.length || 0)
                
                event = this.stripe.webhooks.constructEvent(
                    rawBody,
                    signature,
                    process.env.STRIPE_WEBHOOK_SECRET!
                )

                console.log(`[WEBHOOK] ✅ Event verified: ${event.type} (ID: ${event.id})`)
                console.log(`[WEBHOOK] Event data keys:`, Object.keys(event.data.object))
            } catch (error: any) {
                console.error('[WEBHOOK] ❌ Webhook error:', error.message)
                console.error('[WEBHOOK] Error type:', error.constructor.name)
                console.error('[WEBHOOK] Error code:', error.code)
                console.error('[WEBHOOK] Signature verification failed - check webhook secret')
                
                return response.status(400).json({ 
                    error: `Webhook error: ${error.message}` 
                })
            }
        }

        try {
            
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
                    break

                case 'customer.subscription.created':
                    await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription)
                    break

                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
                    break

                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
                    break

                case 'invoice.payment_succeeded':
                    await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
                    break

                case 'invoice.payment_failed':
                    await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
                    break

                case 'charge.succeeded':
                case 'payment_intent.succeeded':
                case 'payment_intent.created':
                case 'charge.updated':
                    console.log(`[WEBHOOK] Payment event: ${event.type} - acknowledging`)
                    break

                default:
                    console.log(`[WEBHOOK] Unhandled event type: ${event.type}`)
            }
            
            console.log('[WEBHOOK] ✅ Webhook processed successfully')
            return response.status(200).json({ received: true })

        } catch (err: any) {
            console.error('[WEBHOOK] ❌ Webhook error:', err.message)
            console.error('[WEBHOOK] Error type:', err.type)
            console.error('[WEBHOOK] Error code:', err.code)
            if (err.message.includes('signature')) {
                console.error('[WEBHOOK] Signature verification failed - check webhook secret')
            }
            return response.status(400).json({ error: 'Webhook error: ' + err.message })
        }
    }

    private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
        console.log(`[WEBHOOK] Processing checkout session: ${session.id}`)
        console.log(`[WEBHOOK] Session metadata:`, JSON.stringify(session.metadata, null, 2))
        
        // Récupérer le plan depuis les métadonnées
        const newPlan = session.metadata?.plan || 'pro'
        
        // Valider que le plan est supporté
        if (!['pro', 'business'].includes(newPlan)) {
            console.error(`[WEBHOOK] Invalid plan in metadata: ${newPlan}`)
            return
        }
        
        // Récupérer l'ID utilisateur depuis les métadonnées
        const userId = session.metadata?.user_id
        if (!userId) {
            console.error(`[WEBHOOK] ❌ No user_id found in session metadata`)
            console.error(`[WEBHOOK] Available metadata:`, session.metadata)
            return
        }
        
        console.log(`[WEBHOOK] Looking for user with ID: ${userId}`)
        
        // Chercher l'utilisateur existant
        const user = await User.find(userId)
        if (!user) {
            console.error(`[WEBHOOK] ❌ User not found with ID: ${userId}`)
            return
        }
        
        console.log(`[WEBHOOK] Found user: ${user.id} (current plan: ${user.plan})`)
        
        const planInfo = PlanService.getPlanInfo(newPlan)
        console.log(`[WEBHOOK] Upgrading to: ${newPlan} (${planInfo?.price || 'unknown price'})`)
        
        // Mettre à jour l'utilisateur
        const oldPlan = user.plan
        user.plan = newPlan
        user.planUpgradedAt = DateTime.now()
        
        if (session.subscription) {
            user.subscriptionsId = session.subscription as string
        }
        
        await user.save()
        console.log(`[WEBHOOK] ✅ User ${user.id} upgraded from ${oldPlan} to ${newPlan} plan`)
        console.log(`[WEBHOOK] ✅ Subscription ID: ${user.subscriptionsId}`)
        
        // Log final pour confirmation
        console.log(`[WEBHOOK] ✅ Checkout completed successfully - User: ${user.id}, Plan: ${user.plan}`)
    }

    private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
        console.log(`[WEBHOOK] Processing subscription update: ${subscription.id}`)
        
        const user = await User.findBy('subscriptions_id', subscription.id)
        if (!user) {
            console.log(`[WEBHOOK] No user found for subscription: ${subscription.id}`)
            return
        }
        
        // Récupérer le plan depuis les métadonnées de la subscription
        const planFromMeta = subscription.metadata?.plan
        if (planFromMeta && ['pro', 'business'].includes(planFromMeta)) {
            const oldPlan = user.plan
            user.plan = planFromMeta
            await user.save()
            console.log(`[WEBHOOK] ✅ User ${user.id} plan updated from ${oldPlan} to ${planFromMeta}`)
        } else {
            console.log(`[WEBHOOK] No valid plan found in subscription metadata`)
        }
    }

    private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
        console.log(`[WEBHOOK] Processing subscription deletion: ${subscription.id}`)
        
        const user = await User.findBy('subscriptions_id', subscription.id)
        if (!user) {
            console.log(`[WEBHOOK] No user found for subscription: ${subscription.id}`)
            return
        }
        
        const oldPlan = user.plan
        user.plan = 'free'
        user.planDowngradedAt = DateTime.now()
        user.subscriptionsId = undefined
        await user.save()
        
        console.log(`[WEBHOOK] ✅ User ${user.id} downgraded from ${oldPlan} to free plan`)
    }

    private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
        console.log(`[WEBHOOK] Invoice payment succeeded: ${invoice.id}`)
        
        if (invoice.subscription) {
            const user = await User.findBy('subscriptions_id', invoice.subscription as string)
            if (user) {
                console.log(`[WEBHOOK] ✅ Payment confirmed for user ${user.id} (${user.plan} plan)`)
            }
        }
    }

    private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
        console.log(`[WEBHOOK] Invoice payment failed: ${invoice.id}`)
        
        if (invoice.subscription) {
            const user = await User.findBy('subscriptions_id', invoice.subscription as string)
            if (user) {
                console.log(`[WEBHOOK] ⚠️ Payment failed for user ${user.id} (${user.plan} plan)`)
                // Optionnel: envoyer un email ou prendre d'autres actions
            }
        }
    }

    private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
        console.log(`[WEBHOOK] Processing subscription created: ${subscription.id}`)
        console.log(`[WEBHOOK] Subscription metadata:`, JSON.stringify(subscription.metadata, null, 2))
        
        // Récupérer l'ID utilisateur depuis les métadonnées
        const userId = subscription.metadata?.user_id
        if (!userId) {
            console.log(`[WEBHOOK] ⚠️ No user_id found in subscription metadata - this is normal if checkout.session.completed was already processed`)
            console.log(`[WEBHOOK] Skipping subscription.created processing (user likely already upgraded via checkout.session.completed)`)
            return
        }
        
        // Récupérer le plan depuis les métadonnées
        const planFromMeta = subscription.metadata?.plan
        if (!planFromMeta || !['pro', 'business'].includes(planFromMeta)) {
            console.error(`[WEBHOOK] ❌ No valid plan found in subscription metadata: ${planFromMeta}`)
            return
        }

        console.log(`[WEBHOOK] Looking for user with ID: ${userId}`)
        
        // Chercher l'utilisateur existant
        const user = await User.find(userId)
        if (!user) {
            console.error(`[WEBHOOK] ❌ User not found with ID: ${userId}`)
            return
        }
        
        console.log(`[WEBHOOK] Found user: ${user.id} (current plan: ${user.plan})`)
        
        // Vérifier si l'utilisateur a déjà le bon plan (déjà traité par checkout.session.completed)
        if (user.plan === planFromMeta && user.subscriptionsId === subscription.id) {
            console.log(`[WEBHOOK] ✅ User ${user.id} already has ${planFromMeta} plan with this subscription - no update needed`)
            return
        }
        
        console.log(`[WEBHOOK] Updating user to plan: ${planFromMeta}`)
        
        // Mettre à jour l'utilisateur
        const oldPlan = user.plan
        user.plan = planFromMeta
        user.planUpgradedAt = DateTime.now()
        user.subscriptionsId = subscription.id
        await user.save()
        
        console.log(`[WEBHOOK] ✅ User ${user.id} updated from ${oldPlan} to ${planFromMeta} plan`)
        console.log(`[WEBHOOK] ✅ Subscription ID: ${user.subscriptionsId}`)
    }
}




