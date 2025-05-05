import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import Scheduling from '#models/scheduling'
import FollowersHistory from '#models/followers_history'
import { inject } from '@adonisjs/core';
import User from '#models/user';
import { DateTime } from 'luxon';
@inject()

export default class UsersController {
    public async listAccount({ auth }: HttpContext) {
        const user = await auth.authenticate()
        if (user) {
            const accounts = await Account.query().where('user_id', user.id);
            return accounts
        }
        return []
    }

    public async getAuthentifactedUser({ auth }: HttpContext) {
        const user = await auth.authenticate()
        if (!user) {
            throw new Error('User not found')
        }
        return user
    }

    /**
     * Enrichit l'objet utilisateur avec des statistiques supplémentaires
     */
    public async enrichUserWithStats(user: User) {
        try {
            // Récupérer les comptes de l'utilisateur
            const accounts = await Account.query().where('userId', user.id)

            // Calculer le nombre total de followers actuel
            const totalFollowersCount = accounts.reduce((sum, account) => sum + (account.followers_count || 0), 0)

            // Récupérer les planifications (posts programmés) en attente
            const pendingSchedulings = await Scheduling.query()
                .where('userId', user.id)
                .where('status', 'pending')

            // Définir les dates pour aujourd'hui et hier
            const today = DateTime.now().startOf('day')
            const yesterday = today.minus({ days: 1 })

            // Ajouter les statistiques de base à l'objet utilisateur
            user.$extras.scheduledCount = pendingSchedulings.length
            user.$extras.followersCount = totalFollowersCount

            // Récupérer les données d'historique des followers pour hier
            const yesterdayRecord = await FollowersHistory.query()
                .where('userId', user.id)
                .where('recordedAt', yesterday.toSQLDate()!)
                .orderBy('recordedAt', 'desc')
                .first()

            if (yesterdayRecord) {
                // Calcul de la croissance basée sur la différence entre aujourd'hui et hier
                const yesterdayFollowersCount = yesterdayRecord.followersCount
                const growth = totalFollowersCount - yesterdayFollowersCount
                user.$extras.followersGrowth = growth
            } else {
                // S'il n'y a pas de données pour hier, on cherche l'enregistrement le plus récent
                const lastRecord = await FollowersHistory.query()
                    .where('userId', user.id)
                    .orderBy('recordedAt', 'desc')
                    .first()

                if (lastRecord) {
                    const lastFollowersCount = lastRecord.followersCount
                    const growth = totalFollowersCount - lastFollowersCount
                    user.$extras.followersGrowth = growth
                } else {
                    // Si aucun historique n'est disponible, on utilise 0 comme croissance
                    user.$extras.followersGrowth = 0
                }
            }

            // Assurons-nous d'enregistrer les statistiques d'aujourd'hui
            const todayRecord = await FollowersHistory.query()
                .where('userId', user.id)
                .where('recordedAt', today.toSQLDate()!)
                .first()

            if (!todayRecord) {
                // Si aucun enregistrement pour aujourd'hui, on le crée
                await FollowersHistory.create({
                    userId: user.id,
                    followersCount: totalFollowersCount,
                    recordedAt: today,
                })
            } else if (todayRecord.followersCount !== totalFollowersCount) {
                // Si le nombre a changé depuis le dernier enregistrement d'aujourd'hui, on met à jour
                todayRecord.followersCount = totalFollowersCount
                await todayRecord.save()
            }

            return user
        } catch (error) {
            console.error('Error enriching user with stats:', error)
            return user
        }
    }
}