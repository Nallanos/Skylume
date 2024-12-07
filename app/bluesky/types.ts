import type Account from '#models/account'
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
  message: {
    text: string; // Le texte du message (obligatoire, max 10,000 caractères)
    facets?: object[]; // Facettes optionnelles (si nécessaires)
    embed?: object; // Embed optionnel (si nécessaire)
  };
}