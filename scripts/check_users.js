import { Client } from 'pg';

async function checkUsers() {
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

    const result = await client.query(`
      SELECT id, email, plan, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 Latest users in database:');
    result.rows.forEach(user => {
      console.log(`- ${user.id} (${user.email}) - ${user.plan} - ${user.created_at}`);
    });
    
    console.log('\n📊 Total users count:');
    const countResult = await client.query('SELECT COUNT(*) FROM users');
    console.log(`Total users: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('💥 Query failed:', error.message);
  } finally {
    await client.end();
  }
}

checkUsers();
