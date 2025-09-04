import { readFileSync } from 'fs'

async function importUsers() {
  console.log('🚀 Starting user import...')
  
  try {
    // Import dynamic pour éviter les problèmes de modules
    const { Database } = await import('@adonisjs/lucid/database')
    const { DateTime } = await import('luxon')
    const { hash } = await import('@adonisjs/core/services/hash')
    
    // Configuration de la base de données
    const db = new Database({
      connection: process.env.DB_CONNECTION || 'postgres',
      connections: {
        postgres: {
          client: 'pg',
          connection: {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'bluesky_copilot',
          },
        },
      },
    })
    
    // Lire le CSV
    const csvPath = '/workspaces/Bluesky-copilot/data-1757015254569.csv'
    const csvContent = readFileSync(csvPath, 'utf-8')
    const lines = csvContent.split('\n')
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''))
    
    console.log(`📊 Found ${lines.length - 1} records to process`)
    
    let importedCount = 0
    let skippedCount = 0
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue
      
      // Parse CSV line en gérant les guillemets
      const values = []
      let inQuotes = false
      let current = ''
      
      for (let char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current)
          current = ''
        } else {
          current += char
        }
      }
      values.push(current)
      
      const record = {}
      headers.forEach((header, index) => {
        record[header] = values[index] || null
      })
      
      try {
        // Vérifier si l'utilisateur existe
        const existing = await db.from('users').where('id', record.id).first()
        if (existing) {
          console.log(`⚠️  User ${record.id} already exists, skipping...`)
          skippedCount++
          continue
        }
        
        // Préparer les données
        const userData = {
          id: record.id,
          email: record.email === 'NULL' ? null : record.email,
          password: record.password, // Le mot de passe est déjà hashé
          plan: record.plan || 'free',
          dms_sent: parseInt(record.dms_sent) || 0,
          is_dms_limit_reached: record.is_dms_limit_reached === 'True',
          is_scheduled_limit_reached: record.is_scheduled_limit_reached === 'True',
          subscriptions_id: record.subscriptions_id === 'NULL' ? null : record.subscriptions_id,
          posts_per_day: parseInt(record.posts_per_day) || 3,
          current_streak: parseInt(record.current_streak) || 0,
          longest_streak: parseInt(record.longest_streak) || 0,
          last_post_date: record.last_post_date === 'NULL' ? null : record.last_post_date,
          streak_start_date: record.streak_start_date === 'NULL' ? null : record.streak_start_date,
          follower_loadings_this_month: parseInt(record.follower_loadings_this_month) || 0,
          daily_follow_actions_count: parseInt(record.daily_follow_actions_count) || 0,
          last_follow_action_date: record.last_follow_action_date === 'NULL' ? null : record.last_follow_action_date,
          plan_limits_reached: record.plan_limits_reached === 'NULL' ? null : record.plan_limits_reached,
          plan_upgraded_at: record.plan_upgraded_at === 'NULL' ? null : record.plan_upgraded_at,
          plan_downgraded_at: record.plan_downgraded_at === 'NULL' ? null : record.plan_downgraded_at,
          created_at: record.created_at,
          updated_at: record.updated_at,
        }
        
        // Insérer l'utilisateur
        await db.table('users').insert(userData)
        
        console.log(`✅ Imported user: ${record.id}`)
        importedCount++
        
      } catch (error) {
        console.error(`❌ Failed to import user ${record.id}:`, error.message)
      }
    }
    
    console.log(`\n🎉 Import completed!`)
    console.log(`✅ Imported: ${importedCount} users`)
    console.log(`⚠️  Skipped: ${skippedCount} users (already exist)`)
    
    await db.manager.closeAll()
    
  } catch (error) {
    console.error('💥 Import failed:', error.message)
  }
}

importUsers()
