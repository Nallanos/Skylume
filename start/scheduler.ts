import cron from 'node-cron'
import User from '#models/user'

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