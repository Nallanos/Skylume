import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import app from '@adonisjs/core/services/app'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',
  /**
   * Data that should be shared with all rendered pages
   */
  sharedData: {
    errors: (ctx) => ctx.session?.flashMessages.get('errors'),
    user: async (ctx) => {
      const user = ctx.auth?.user

      if (user) {
        await user.load('account')
        await user.load("scheduling")

        // Calculer les statistiques de l'utilisateur
        // Utilisation d'une importation dynamique pour supporter HMR (Hot Module Replacement)
        const { default: UsersController } = await import('#controllers/users_controller')
        const usersController = await app.container.make(UsersController)
        await usersController.enrichUserWithStats(user)

        return {
          id: user.id,
          email: user.email,
          plan: user.plan,
          isScheduledLimitReached: user.isScheduledLimitReached,
          isDmsLimitReached: user.isDmsLimitReached,
          marketing_consent: user.marketing_consent,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          // Ajouter les nouvelles statistiques
          scheduledCount: user.scheduledCount,
          followersCount: user.followersCount,
          followersGrowth: user.followersGrowth,
          account: user.account.map(account => ({
            id: account.id,
            jobId: account.jobId,
            did: account.did,
            isRateLimited: account.isRateLimited,
            handle: account.handle,
            number_of_message_sent: account.number_of_message_sent,
            number_of_message_received: account.number_of_message_received,
            seenNotificationAt: account.seenNotificationAt,
          })),
          scheduling: user.scheduling.map(schedule => ({
            id: schedule.id,
            account_id: schedule.account_id,
            message: schedule.message,
            scheduleTime: schedule.scheduleTime,
          }))
        }
      }

      return null
    },
    sessionStripe: (ctx) => ctx.session?.flashMessages.get('sessionStripe')
  },

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: true,
    entrypoint: 'inertia/app/ssr.ts'
  }
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> { }
}