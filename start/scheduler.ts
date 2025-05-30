import cron from 'node-cron'
import User from '#models/user'
import app from '@adonisjs/core/services/app'

// Réinitialisation des compteurs au 1er jour de chaque mois (à minuit)
cron.schedule('0 0 1 * *', async () => {
    let users = await User.findManyBy("plan", "free")
    for (const user of users) {
        user.postScheduled = 0
        user.dmsSent = 0
        user.isDmsLimitReached = false
        user.isScheduledLimitReached = false
        user.save()
    }
})

// Enregistrement quotidien du nombre d'abonnés (tous les jours à 1h du matin)
cron.schedule('0 1 * * *', async () => {
    try {
        const { default: RecordFollowersCountCommand } = await import('../commands/record_followers_count.js')
        const command = await app.container.make(RecordFollowersCountCommand)
        await command.exec()
        console.log('Nombre d\'abonnés enregistré avec succès.')
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement du nombre d\'abonnés:', error)
    }
})
