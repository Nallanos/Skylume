import fs from 'fs';
import { Client } from 'pg';

// Parse CSV with proper quote and comma handling in values
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Double quote = escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add last field
  result.push(current.trim());
  return result;
}

async function importUsers() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'blueskybluesky',
    password: 'blueskybluesky',
    database: 'blueskybluesky',
  });

  try {
    await client.connect();
    console.log('🔌 Connected to database');

    const csvContent = fs.readFileSync('data-1757015254569.csv', 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Parse headers
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, ''));
    console.log('Headers:', headers);
    
    console.log('📊 Processing', lines.length - 1, 'records...');
    
    let imported = 0;
    let skipped = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      if (values.length !== headers.length) {
        console.log(`⚠️  Skipping malformed line ${i}: expected ${headers.length} fields, got ${values.length}`);
        continue;
      }
      
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index] === 'NULL' || values[index] === '' ? null : values[index];
      });
      
      // Debug first record
      if (i === 1) {
        console.log('First record:', record);
      }
      
      try {
        // Check if user exists
        const existingUser = await client.query('SELECT id FROM users WHERE id = $1', [record.id]);
        if (existingUser.rows.length > 0) {
          console.log('⚠️  Skipping existing user:', record.id);
          skipped++;
          continue;
        }
        
        // Insert user
        await client.query(`
          INSERT INTO users (
            id, email, password, plan, dms_sent, is_dms_limit_reached, 
            is_scheduled_limit_reached, subscriptions_id, posts_per_day, 
            current_streak, longest_streak, last_post_date, streak_start_date,
            follower_loadings_this_month, daily_follow_actions_count, 
            last_follow_action_date, plan_limits_reached, plan_upgraded_at, 
            plan_downgraded_at, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 
            $14, $15, $16, $17, $18, $19, $20, $21
          )
        `, [
          record.id,
          record.email,
          record.password,
          record.plan || 'free',
          parseInt(record.dms_sent) || 0,
          record.is_dms_limit_reached === 'True',
          record.is_scheduled_limit_reached === 'True',
          record.subscriptions_id,
          parseInt(record.posts_per_day) || 3,
          parseInt(record.current_streak) || 0,
          parseInt(record.longest_streak) || 0,
          record.last_post_date,
          record.streak_start_date,
          parseInt(record.follower_loadings_this_month) || 0,
          parseInt(record.daily_follow_actions_count) || 0,
          record.last_follow_action_date,
          record.plan_limits_reached,
          record.plan_upgraded_at,
          record.plan_downgraded_at,
          record.created_at,
          record.updated_at
        ]);
        
        console.log('✅ Imported:', record.id);
        imported++;
        
      } catch (error) {
        console.error('❌ Failed to import', record.id, ':', error.message);
      }
    }
    
    console.log('\n🎉 Import completed!');
    console.log('✅ Imported:', imported, 'users');
    console.log('⚠️  Skipped:', skipped, 'users');
    
  } catch (error) {
    console.error('💥 Import failed:', error.message);
  } finally {
    await client.end();
  }
}

importUsers();
