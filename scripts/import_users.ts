import { app } from '../bin/bootstrap.js'
import ImportUsersFromCsv from '../commands/import_users_from_csv.js'

async function runImport() {
  try {
    await app.start()
    
    const importer = new ImportUsersFromCsv()
    await importer.run()
    
    console.log('Import completed successfully!')
  } catch (error) {
    console.error('Import failed:', error)
  } finally {
    await app.terminate()
  }
}

runImport()
