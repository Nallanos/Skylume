import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'

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

        for (const account of user.account) {
          await account.load('listeners')
        }

        return {
          id: user.id,
          email: user.email,
          marketing_consent: user.marketing_consent,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          account: user.account.map(account => ({
            id: account.id,
            jobId: account.jobId,
            did: account.did,
            isRateLimited: account.isRateLimited,
            handle: account.handle,
            number_of_message_sent: account.number_of_message_sent,
            number_of_message_received: account.number_of_message_received,
            seenNotificationAt: account.seenNotificationAt,
            listeners: account.listeners.map(listener => ({
              id: listener.id,
              isActive: listener.isActive,
              event: listener.event,
              handler: listener.handler,
              wait_time: listener.wait_time,
              message: listener.message,
              action: listener.action,
              number_of_message_sent: listener.number_of_message_sent,
              number_of_message_received: listener.number_of_message_received,
            }))
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
    }
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