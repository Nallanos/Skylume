import type Account from '#models/account'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
import type { MessageInput } from '@atproto/api/dist/client/types/chat/bsky/convo/defs.js'
import type { EventStrategy } from '@skyware/bot'

// Base event type with generic event name
export type Event<T extends string> = {
  type: T
  wait_time: number
}

// Specific event types
export type FollowEvent = Event<'follow'>

// Interface for event handlers
export interface IEventHandler {
  createOrResumeSession(account: Account): Promise<void>
  on(): void
  off(): void
}

// Type for bot configuration
export interface BotConfig {
  eventEmitterOptions: {
    strategy: EventStrategy
  }
}
export type NotificationData = {
  authorDid: string,
  event: string,
  indexedAt: string,
}

export type MessagePayload = {
  convoId: string; // L'ID de la conversation
  message: MessageInput
}

export type FollowerWithScore = {
  profile: ProfileView,
  score: number
}