import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'
import Account from '#models/account'
import FollowersHistory from '#models/followers_history'
import { DateTime } from 'luxon'

export default class RecordFollowersCount extends BaseCommand {
  static commandName = 'record:followers-count'
  static description = 'Enregistre le nombre quotidien d\'abonnés pour chaque utilisateur'

  static options: CommandOptions = {}

  async run() {
    this.logger.info('Début de l\'enregistrement quotidien du nombre d\'abonnés')

    try {
      const today = DateTime.now().startOf('day')

      // Récupérer tous les utilisateurs
      const users = await User.all()

      this.logger.info(`Traitement de ${users.length} utilisateurs`)

      for (const user of users) {
        try {
          // Charger les comptes de l'utilisateur
          const accounts = await Account.query().where('userId', user.id)

          // Calculer le nombre total de followers
          const totalFollowersCount = accounts.reduce(
            (sum, account) => sum + (account.followers_count || 0),
            0
          )

          // Vérifier s'il existe déjà un enregistrement pour aujourd'hui
          const existingRecord = await FollowersHistory.query()
            .where('userId', user.id)
            .where('recordedAt', today.toSQLDate()!)
            .first()

          if (existingRecord) {
            // Mettre à jour l'enregistrement existant
            existingRecord.followersCount = totalFollowersCount
            await existingRecord.save()
            this.logger.info(`Mise à jour du nombre d'abonnés pour l'utilisateur ${user.id}: ${totalFollowersCount}`)
          } else {
            // Créer un nouvel enregistrement
            await FollowersHistory.create({
              userId: user.id,
              followersCount: totalFollowersCount,
              recordedAt: today,
            })
            this.logger.info(`Nouvel enregistrement du nombre d'abonnés pour l'utilisateur ${user.id}: ${totalFollowersCount}`)
          }
        } catch (error) {
          this.logger.error(`Erreur lors du traitement de l'utilisateur ${user.id}: ${error.message}`)
        }
      }

      this.logger.success('Enregistrement quotidien du nombre d\'abonnés terminé avec succès')
    } catch (error) {
      this.logger.error(`Erreur lors de l'enregistrement des statistiques: ${error.message}`)
      this.exitCode = 1
    }
  }
}