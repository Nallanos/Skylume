// import { Bot } from '@skyware/bot'
// import type { AtpSessionData } from '@atcute/client'
// import type { IEventHandler } from './types.js'
// import Account from '#models/account'
// import type Listener from '#models/listener'
// import logger from '@adonisjs/core/services/logger'

// /**
//  * Handles event-based actions for a bot account
//  */
// export class EventHandler implements IEventHandler {
//   private bot: Bot

//   /**
//    * Creates a new event handler instance
//    */
//   constructor(
//     private account: Account,
//     private listener: Listener
//   ) {
//     this.bot = new Bot()
//   }

//   /**
//    * Creates or resumes a bot session using account credentials
//    */
//   public async createOrResumeSession(): Promise<void> {
//     logger.debug('[Bluesky][Handler][createOrResumeSession] creating or resuming session...')
//     try {
//       const session = this.account.at_session

//       if (session) {
//         await this.resumeExistingSession(session)
//         logger.debug('[Bluesky][Handler][createOrResumeSession] successfully resumed session...')
//       } else {
//         await this.createNewSession()
//         logger.debug('[Bluesky][Handler][createOrResumeSession] successfully created session...')
//       }
//     } catch (err) {
//       logger.error('[Bluesky][Handler][createOrResumeSession] Session creation/resume failed:', err)
//     }
//   }

//   /**
//    * Resumes an existing bot session
//    */
//   private async resumeExistingSession(session: AtpSessionData): Promise<void> {
//     const resumeSessionPayLoad: AtpSessionData = {
//       did: session.did,
//       handle: this.account.bksy_social,
//       accessJwt: session.accessJwt,
//       refreshJwt: session.refreshJwt,
//       active: true,
//     }
//     await this.bot.resumeSession(resumeSessionPayLoad)
//   }

//   /**
//    * Creates a new bot session
//    */
//   private async createNewSession(): Promise<void> {
//     const session = (await this.bot.login({
//       identifier: this.account.did,
//       password: this.account.app_password,
//     })) as AtpSessionData


//     if (session) {
//       this.account.session = JSON.stringify(session)
//     }
//   }

//   /**
//    * Activates event listening based on configured action
//    */
//   async on(): Promise<void> {
//     try {
//       await this.createOrResumeSession()

//       if (this.listener.action === 'Send a Message' && this.listener.message) {
//         this.sendMessageOnFollowHandler()
//       } else if (this.listener.action === 'Follow') {
//         this.followBackHandler()
//       }
//     } catch (err) {
//       console.error('Event handler activation failed:', err)
//     }
//   }

//   /**
//    * Registers message sending handler
//    */
//   private sendMessageOnFollowHandler(): void {
//     logger.debug('[Bluesky][Handler][registerMessageHandler] registering message handler...')
//     this.bot.on('follow', (reply) => {
//       logger.debug('[Bluesky][Handler][registerMessageHandler] starting timeout to send message...')

//       setTimeout(async () => {
//         logger.debug('[Bluesky][Handler][registerMessageHandler] sending message...')
//         await reply.user.sendMessage({ text: this.listener.message! })
//       }, 30 * 1000)
//     })
//   }

//   /**
//    * Registers follow-back handler
//    */
//   private followBackHandler(): void {
//     console.log(this.bot)
//     this.bot.on('follow', (reply) => {
//       setTimeout(async () => {
//         await reply.user.follow()
//       }, 25 * 1000)
//     })
//   }

//   /**
//    * Deactivates event listening
//    */
//   off(): void {
//     if (this.bot) {
//       // Note: Implement proper cleanup logic here
//       // this.bot.removeAllListeners()
//     }
//   }
// }
