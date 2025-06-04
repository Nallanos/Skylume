import {
    Jetstream
} from "@skyware/jetstream";
import { EventEmitter } from 'node:events';

/**
 * Types for follow events
 */
export interface FollowEvent {
    did: string;         // The DID of the user who is following
    subject: string;     // The DID of the user being followed
    timestamp: number;   // When the follow happened
    rkey: string;        // Record key
    record: any;         // Full record data
}

/**
 * FirehoseSubscriber - Handles Bluesky firehose subscription and filtering
 * Implements EventEmitter pattern for easy event handling
 */
export default class FirehoseSubscriber extends EventEmitter {
    protected jetstream: Jetstream | null = null;
    public isRunning: boolean = false;


    protected followCollection: string = 'app.bsky.graph.follow';

    /**
     * Creates a new FirehoseSubscriber instance
     * 
     * @param options Configuration options
     * @param options.endpoint Custom Jetstream endpoint URL (optional)
     * @param options.cursor Starting cursor position (optional)
     */
    constructor(options: {
        endpoint?: string,
        cursor?: number
    } = {}) {
        super();

        // Initialize Jetstream with appropriate configuration
        this.jetstream = new Jetstream({
            wantedCollections: [this.followCollection],
            cursor: options.cursor,
            endpoint: options.endpoint
        });

        // Setup event handlers
        this.setupEventHandlers();
    }

    /**
     * Configure event handlers for the Jetstream instance
     * @private
     */
    private setupEventHandlers(): void {
        if (!this.jetstream) return;

        // Handle general connection events
        this.jetstream.on('open', () => {
            console.log('Firehose: WebSocket connection opened');
            this.emit('connected');
        });

        this.jetstream.on('close', () => {
            console.log('Firehose: WebSocket connection closed');
            this.emit('disconnected');
        });

        this.jetstream.on('error', (error) => {
            console.error(`Firehose error: ${error}`);
            this.emit('error', error);
        });

        // Handle follow events using the onCreate method
        this.jetstream.onCreate(this.followCollection, (event: any) => {
            try {
                // Extract the follow information from the event
                // Note: The actual structure may need to be adjusted based on the exact format provided by @skyware/jetstream
                const followEvent: FollowEvent = {
                    did: event.did || event.repo,                            // User doing the following
                    subject: event.record?.subject || event.commit?.record?.subject, // User being followed
                    timestamp: event.time || Date.now(),
                    rkey: event.rkey || event.commit?.rkey || '',
                    record: event.record || event.commit?.record || {}
                };

                this.emit('follow', followEvent);
            } catch (error) {
                console.error(`Error processing follow event: ${error}`);
            }
        });

        // Handle unfollow events (deletes of follow records)
        this.jetstream.onDelete(this.followCollection, (event: any) => {
            try {
                // For unfollow, we only have the rkey, not the full record
                const unfollowEvent = {
                    did: event.did || event.repo,
                    rkey: event.rkey || event.commit?.rkey || '',
                    timestamp: event.time || Date.now(),
                };

                this.emit('unfollow', unfollowEvent);
            } catch (error) {
                console.error(`Error processing unfollow event: ${error}`);
            }
        });
    }

    /**
     * Start listening to the firehose
     */
    public start(): void {
        if (this.isRunning) return;

        if (this.jetstream) {
            this.jetstream.start();
            this.isRunning = true;
            console.log('Firehose subscriber started');
        } else {
            console.error('Cannot start firehose - jetstream not initialized');
        }
    }

    /**
     * Stop listening to the firehose
     */
    public stop(): void {
        if (!this.isRunning) return;

        if (this.jetstream) {
            this.jetstream.close();
            this.isRunning = false;
            console.log('Firehose subscriber stopped');
        }
    }

    /**
     * Watch for follows of a specific account (by DID)
     * 
     * @param targetDid The DID of the account to watch for follows
     * @param callback Function to call when the account is followed
     * @returns Unsubscribe function
     */
    public watchFollowsForAccount(targetDid: string, callback: (event: FollowEvent) => void): () => void {
        // Create handler that filters for events where the subject is our target DID
        const handler = (event: FollowEvent) => {
            if (event.subject === targetDid) {
                callback(event);
            }
        };

        // Register the handler
        this.on('follow', handler);

        // Return unsubscribe function
        return () => {
            this.off('follow', handler);
        };
    }

    /**
     * Watch for follows of multiple accounts (by DIDs)
     * 
     * @param targetDids Array of DIDs of the accounts to watch for follows
     * @param callback Function to call when any of the accounts is followed
     * @returns Unsubscribe function
     */
    public watchFollowsForAccounts(targetDids: string[], callback: (event: FollowEvent) => void): () => void {
        if (!targetDids.length) {
            console.warn('No DIDs provided to watchFollowsForAccounts');
            return () => { }; // Empty unsubscribe function
        }

        // Convert array to Set for O(1) lookups
        const didSet = new Set(targetDids);

        // Create handler that filters for events where the subject is in our target DIDs
        const handler = (event: FollowEvent) => {
            if (didSet.has(event.subject)) {
                callback(event);
            }
        };

        // Register the handler
        this.on('follow', handler);

        // Return unsubscribe function
        return () => {
            this.off('follow', handler);
        };
    }

    /**
     * Watch for unfollows of a specific account (by DID)
     * Note: For unfollows we don't have the subject available directly,
     * applications would need to track follow/unfollow state themselves
     * 
     * @param callback Function to call on any unfollow event
     * @returns Unsubscribe function
     */
    public watchUnfollows(callback: (event: any) => void): () => void {
        this.on('unfollow', callback);

        return () => {
            this.off('unfollow', callback);
        };
    }

    /**
     * Update firehose subscription options
     * 
     * @param options Options to update
     */
    public updateOptions(options: {
        wantedDids?: string[],
        cursor?: number
    }): void {
        if (!this.jetstream) return;

        // Always keep the follow collection in the wanted collections
        const updatedOptions = {
            ...options,
            wantedCollections: [this.followCollection]
        };

        this.jetstream.updateOptions(updatedOptions);
    }
}