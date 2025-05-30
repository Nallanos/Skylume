#!/usr/bin/env node

// Simple debugging script to check database state
import { Ignitor } from '@adonisjs/core'

const APP_ROOT = new URL('./', import.meta.url)
const IMPORTER = (filePath) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

const ignitor = new Ignitor(APP_ROOT, { importer: IMPORTER })
const app = ignitor.createApp('console')

async function debugDatabase() {
    try {
        await app.booted()

        const { default: AnalysisAudience } = await import('./build/app/models/analysis_audience.js')
        const { default: Account } = await import('./build/app/models/account.js')

        console.log('=== Checking AnalysisAudience records ===')
        const analyses = await AnalysisAudience.all()
        console.log(`Found ${analyses.length} analysis records:`)
        analyses.forEach(analysis => {
            console.log(`- ID: ${analysis.id}, Account: ${analysis.accountId}, Status: ${analysis.status}`)
        })

        console.log('\n=== Checking Account records ===')
        const accounts = await Account.all()
        console.log(`Found ${accounts.length} account records:`)
        accounts.forEach(account => {
            console.log(`- ID: ${account.id}, Handle: ${account.handle}`)
        })

        console.log('\n=== Checking specific records ===')
        const analysis1 = await AnalysisAudience.find(1)
        console.log('Analysis ID 1:', analysis1 ? analysis1.toJSON() : 'Not found')

        const accountById = await Account.find('92244e08fe5d423cb8d296d0e46d6463')
        console.log('Account found by ID:', accountById ? `${accountById.handle} (${accountById.id})` : 'Not found')

        process.exit(0)
    } catch (error) {
        console.error('Error:', error)
        process.exit(1)
    }
}

debugDatabase()
