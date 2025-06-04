import { inject } from "@adonisjs/core";
import { Logger } from '@adonisjs/core/logger';
import FirehoseSubscriber from "../bluesky/firehose_subscriber.js";
import Account from "../models/account.js";
import type { FollowEvent } from "../bluesky/firehose_subscriber.js";
import AccountService from "./account_service.js";
import type { AiSchedulerService } from "./ai_scheduler_service.js";
import crypto from 'node:crypto'


@inject()
export class FirehoseSubscriberService {
  /**
   * Flag to track if the listener is currently active
   */
  public isListening: boolean = false;

  /**
   * Function to unsubscribe from the follow events when needed
   */
  private unsubscribeFunction: (() => void) | null = null;

  constructor(
    protected firehoseService: FirehoseSubscriber,
    protected logger: Logger,
    protected accountService: AccountService,
    protected aiSchedulerService: AiSchedulerService
  ) { }

  /**
   * Listens to follow events for all accounts in the database
   * 
   * @returns Promise<boolean> True if successful, false otherwise
   */
  public async listenToAllAccounts(): Promise<boolean> {
    try {
      // Avoid multiple listeners
      if (this.isListening) {
        this.logger.info('Firehose listener is already active');
        return true;
      }

      // Get all accounts from the database
      const accounts = await Account.all();

      // Extract DIDs from accounts
      const accountDids = accounts.map(account => account.did);

      if (accountDids.length === 0) {
        this.logger.warn('No accounts found to listen for follows');
        return false;
      }

      // Log the start of listening
      this.logger.info(`Starting to listen for follows on ${accountDids.length} accounts`);

      // Register the follow handler
      this.unsubscribeFunction = this.firehoseService.watchFollowsForAccounts(
        accountDids,
        this.handleFollowEvent.bind(this)
      );

      // Start the firehose if it's not already running
      if (!this.firehoseService.isRunning) {
        this.firehoseService.start();
      }

      this.isListening = true;
      return true;
    } catch (error) {
      this.logger.error(`Error setting up firehose listener: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop listening to follow events
   */
  public stopListening(): void {
    if (this.unsubscribeFunction) {
      this.unsubscribeFunction();
      this.unsubscribeFunction = null;
    }

    this.isListening = false;
    this.logger.info('Stopped listening for follow events');
  }

  /**
   * Handle incoming follow events, finding the related account and incrementing
   * the follower analysis counter
   * 
   * @param event Follow event from the firehose
   */
  private async handleFollowEvent(event: FollowEvent): Promise<void> {
    try {
      await this.trackFollowerAndProcessAnalytics(event.subject);
    } catch (error) {
      this.logger.error(`Error handling follow event: ${error.message}`);
    }
  }

  /**
   * Récupère un compte par son DID ou le crée s'il n'existe pas
   * 
   * @param accountDid Le DID du compte à chercher
   * @returns Le compte trouvé ou créé
   */
  private async findOrResolveAccount(accountDid: string): Promise<Account> {
    try {
      return await Account.findByOrFail('did', accountDid);
    } catch (error) {
      // Si le compte n'est pas trouvé par DID, on essaie de le résoudre via l'API
      const apiAccount = await this.accountService.getProfile(accountDid);
      const account = await Account.findByOrFail("handle", apiAccount.handle);
      account.did = apiAccount.did;
      await account.save();
      return account;
    }
  }

  /**
   * Incrémente le compteur de followers à analyser pour un compte
   * 
   * @param account Le compte à mettre à jour
   * @returns Vrai si le seuil est atteint, faux sinon
   */
  private async incrementFollowerCounter(account: Account): Promise<boolean> {
    const FOLLOWER_THRESHOLD = 100;

    // Incrémente le compteur
    if (!account.numbersOfFollowersToAnalyze) {
      account.numbersOfFollowersToAnalyze = 1;
    } else {
      account.numbersOfFollowersToAnalyze += 1;
    }

    // Vérifie si le seuil est atteint
    const thresholdReached = account.numbersOfFollowersToAnalyze === FOLLOWER_THRESHOLD;

    // Sauvegarde les modifications
    await account.save();

    this.logger.info(`Incremented follower analysis counter for account ${account.did}. New value: ${account.numbersOfFollowersToAnalyze}`);

    return thresholdReached;
  }

  /**
   * Programme une analyse lorsque le seuil de followers est atteint
   * 
   * @param account Le compte qui a atteint le seuil
   */
  private async scheduleAnalysis(account: Account): Promise<void> {
    const FOLLOWER_THRESHOLD = 100;

    try {
      this.logger.info(`Account ${account.handle} (${account.id}) has reached the follower threshold of ${FOLLOWER_THRESHOLD}. Scheduling analysis.`);

      // Réinitialise le compteur après avoir atteint le seuil
      account.numbersOfFollowersToAnalyze = 0;
      await account.save();

      // Génère un ID unique et ajoute à la file d'attente Redis
      const hashId = crypto.randomBytes(16).toString('hex');
      await this.aiSchedulerService.addAccountToRecurringAnalysisQueue(
        hashId,
        0,
        {
          followersCount: FOLLOWER_THRESHOLD,
          accountHandle: account.handle
        }
      );
    } catch (queueError) {
      this.logger.error(`Failed to schedule threshold analysis for account ${account.handle}: ${queueError.message}`);
      // On ne propage pas l'erreur pour éviter de casser le mécanisme de comptage
    }
  }

  /**
   * Suit un nouveau follower et programme une analyse si nécessaire
   * Cette fonction orchestre les étapes du processus
   * 
   * @param accountDid Le DID du compte à mettre à jour
   * @returns Promise<boolean> True si succès, false sinon
   */
  public async trackFollowerAndProcessAnalytics(accountDid: string): Promise<boolean> {
    try {
      // 1. Trouver ou résoudre le compte
      const account = await this.findOrResolveAccount(accountDid);

      // 2. Incrémenter le compteur et vérifier le seuil
      const thresholdReached = await this.incrementFollowerCounter(account);

      // 3. Si le seuil est atteint, programmer l'analyse
      if (thresholdReached) {
        await this.scheduleAnalysis(account);
      }

      return true;
    } catch (error) {
      this.logger.error(`Error processing follower for account ${accountDid}: ${error.message}`);
      return false;
    }
  }
}