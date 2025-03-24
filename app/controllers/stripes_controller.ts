import type { HttpContext } from '@adonisjs/core/http'
import { Stripe } from "stripe"
import User from '#models/user'

export default class StripesController {
    private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    public async downgradePlan({ response, auth }: HttpContext) {
        const user = await auth.authenticate()
        if (!user) throw new Error("not auth")
        if (!user.subscriptionsId) throw new Error("user.subscriptionsId not defined")
        await this.stripe.subscriptions.cancel(user.subscriptionsId, { invoice_now: true, prorate: true })
        user!.plan = "free"
        await user!.save()
        return response.redirect("/dashboard")
    }

    public async redirectToStripe({ response, inertia, auth }: HttpContext) {
        const coupon = await this.stripe.coupons.create({
            percent_off: 100,
            duration: 'once',
            name: 'Free Trial',
        });

        await this.stripe.promotionCodes.create({
            coupon: coupon.id,
            code: 'FREETRIAL',
        });

        const user = auth.user
        if (!user) return response.redirect("/dashboard")
        const sessionStripe = await this.stripe.checkout.sessions.create({
            line_items: [{
                price: process.env.STRIPE_PRICE_ID,
                quantity: 1,
            }],
            mode: 'subscription',
            success_url: `https://bluesky-bot.com//dashboard`,
            cancel_url: `https://bluesky-bot.com//dashboard`,
            metadata: {
                user_id: user.id
            },
            allow_promotion_codes: true,
            subscription_data: {
                metadata: {
                    user_id: user.id
                }
            }
        })
        if (!sessionStripe.url) return response.redirect().back()
        await inertia.location(sessionStripe.url)
    }

    public async getPaymentSucceeded({ request, response }: HttpContext) {
        const signature = request.header('stripe-signature')

        if (!signature) {
            return 'No signature provided'
        }

        try {
            const event = this.stripe.webhooks.constructEvent(
                request.raw()!,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET!
            )

            // Handle the event
            console.log("handling a payment")
            switch (event.type) {
                case 'checkout.session.completed':
                    console.log("checkout.session.completed")
                    const session = event.data.object as Stripe.Checkout.Session
                    const user = await User.find(session.metadata!.user_id)
                    if (!user) {
                        console.log("user not found in stripe handingling respose")
                        return response.redirect().back()
                    }
                    else {
                        console.log("makinng user premium")
                        user.plan = "premium"
                        if (session.subscription) {
                            user.subscriptionsId = session.subscription as string
                        }
                        await user.save()
                    }
                    return response.redirect("/dashboard")
                default:
                    console.log(`Unhandled event type ${event.type}`)
            }
            return 'Received'

        } catch (err) {
            console.error(err)
        }
    }
}




