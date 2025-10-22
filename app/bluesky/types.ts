/**
 * Types for Bluesky messaging and notifications
 */

export interface MessagePayload {
  convoId: string
  message: {
    text: string
  }
}

export interface NotificationData {
  authorDid: string
  event: string
  indexedAt: string
}
