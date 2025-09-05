import User from '#models/user'
import { DateTime } from 'luxon'
import { readFileSync } from 'fs'

export default class ImportUsersFromCsv {
  static commandName = 'import:users:csv'
  static description = 'Import users from CSV file'

  async run() {
    const csvPath = '/workspaces/Bluesky-copilot/data-1757015254569.csv'
    
    console.log('Starting CSV import...')
    
    try {
      // Lire le fichier CSV
      const csvContent = readFileSync(csvPath, 'utf-8')
      const lines = csvContent.split('\n')
      const headers = lines[0].split(',').map(h => h.replace(/"/g, ''))
      const records = []

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue
        
        const values = lines[i].split(',').map(v => v.replace(/"/g, ''))
        const record: any = {}
        
        headers.forEach((header, index) => {
          record[header] = values[index] || null
        })
        
        records.push(record)
      }

      console.log(`Found ${records.length} records to import`)

      let importedCount = 0
      let skippedCount = 0

      for (const record of records) {
        try {
          // Vérifier si l'utilisateur existe déjà
          const existingUser = await User.find(record.id)
          if (existingUser) {
            console.log(`User ${record.id} already exists, skipping...`)
            skippedCount++
            continue
          }

          // Créer l'utilisateur
          const user = await User.create({
            id: record.id,
            email: record.email === 'NULL' ? null : record.email,
            password: record.password,
            plan: record.plan || 'free',
            dmsSent: parseInt(record.dms_sent) || 0,
            isDmsLimitReached: record.is_dms_limit_reached === 'True',
            isScheduledLimitReached: record.is_scheduled_limit_reached === 'True',
            subscriptionsId: record.subscriptions_id === 'NULL' ? undefined : record.subscriptions_id,
            postsPerDay: parseInt(record.posts_per_day) || 3,
            currentStreak: parseInt(record.current_streak) || 0,
            longestStreak: parseInt(record.longest_streak) || 0,
            lastPostDate: record.last_post_date && record.last_post_date !== 'NULL' ? DateTime.fromISO(record.last_post_date) : null,
            streakStartDate: record.streak_start_date && record.streak_start_date !== 'NULL' ? DateTime.fromISO(record.streak_start_date) : null,
            followerLoadingsThisMonth: parseInt(record.follower_loadings_this_month) || 0,
            dailyFollowActionsCount: parseInt(record.daily_follow_actions_count) || 0,
            lastFollowActionDate: record.last_follow_action_date && record.last_follow_action_date !== 'NULL' ? DateTime.fromISO(record.last_follow_action_date) : null,
            planLimitsReached: record.plan_limits_reached === 'NULL' ? null : record.plan_limits_reached,
            planUpgradedAt: record.plan_upgraded_at && record.plan_upgraded_at !== 'NULL' ? DateTime.fromISO(record.plan_upgraded_at) : null,
            planDowngradedAt: record.plan_downgraded_at && record.plan_downgraded_at !== 'NULL' ? DateTime.fromISO(record.plan_downgraded_at) : null,
            createdAt: DateTime.fromISO(record.created_at),
            updatedAt: DateTime.fromISO(record.updated_at),
          })

          console.log(`✅ Imported user: ${user.id}`)
          importedCount++
        } catch (error: any) {
          console.error(`❌ Failed to import user ${record.id}: ${error.message}`)
        }
      }

      console.log(`Import completed!`)
      console.log(`✅ Imported: ${importedCount} users`)
      console.log(`⚠️  Skipped: ${skippedCount} users (already exist)`)
      
    } catch (error: any) {
      console.error(`Failed to import CSV: ${error.message}`)
    }
  }
}
