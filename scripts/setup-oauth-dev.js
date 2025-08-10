#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Update .env file with ngrok URL for OAuth development
 * Usage: node scripts/setup-oauth-dev.js https://abc123.ngrok.io
 */

function updateEnvForNgrok(ngrokUrl) {
  const envPath = path.join(__dirname, '..', '.env')
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!')
    process.exit(1)
  }
  
  let envContent = fs.readFileSync(envPath, 'utf8')
  
  // Backup original .env
  const backupPath = path.join(__dirname, '..', '.env.backup')
  fs.writeFileSync(backupPath, envContent)
  console.log('📦 Backed up .env to .env.backup')
  
  // Update OAuth URLs for ngrok
  envContent = envContent.replace(
    /APP_URL=.*/,
    `APP_URL=${ngrokUrl}`
  )
  envContent = envContent.replace(
    /BLUESKY_OAUTH_CLIENT_ID=.*/,
    `BLUESKY_OAUTH_CLIENT_ID=${ngrokUrl}/.well-known/oauth_client`
  )
  envContent = envContent.replace(
    /BLUESKY_OAUTH_REDIRECT_URI=.*/,
    `BLUESKY_OAUTH_REDIRECT_URI=${ngrokUrl}/oauth/callback`
  )
  
  fs.writeFileSync(envPath, envContent)
  console.log(`✅ Updated .env with ngrok URL: ${ngrokUrl}`)
  console.log('🔄 Please restart your development server for changes to take effect')
}

function restoreEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  const backupPath = path.join(__dirname, '..', '.env.backup')
  
  if (!fs.existsSync(backupPath)) {
    console.error('❌ No backup found!')
    process.exit(1)
  }
  
  const backupContent = fs.readFileSync(backupPath, 'utf8')
  fs.writeFileSync(envPath, backupContent)
  console.log('✅ Restored .env from backup')
  console.log('🔄 Please restart your development server for changes to take effect')
}

function showUsage() {
  console.log(`
🚀 OAuth Development Setup Helper

Usage:
  node scripts/setup-oauth-dev.js <ngrok-url>    # Set ngrok URL
  node scripts/setup-oauth-dev.js restore        # Restore original .env

Examples:
  node scripts/setup-oauth-dev.js https://abc123.ngrok.io
  node scripts/setup-oauth-dev.js restore

Steps to test OAuth:
1. Start your dev server: npm run dev
2. Start ngrok: ngrok http 8081
3. Run this script with the ngrok URL
4. Restart your dev server
5. Test OAuth at the ngrok URL
  `)
}

// Main execution
const command = process.argv[2]

if (!command) {
  showUsage()
  process.exit(0)
}

if (command === 'restore') {
  restoreEnv()
} else if (command.startsWith('https://') && (command.includes('ngrok') || command.includes('lhr.life') || command.includes('localhost.run'))) {
  updateEnvForNgrok(command)
} else {
  console.error('❌ Invalid command or URL format')
  showUsage()
  process.exit(1)
}
