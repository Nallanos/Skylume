/**
 * Utility functions for DM Campaign keyword handling
 */

/**
 * Safely parse keywords from database - handles both JSON arrays and comma-separated strings
 */
export function parseKeywords(keywords: string | null | undefined): string[] {
  if (!keywords) return []
  
  try {
    // First try to parse as JSON
    const parsed = JSON.parse(keywords)
    return Array.isArray(parsed) ? parsed : [String(parsed)]
  } catch {
    // If JSON parsing fails, assume it's a comma-separated string
    return keywords
      .split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0)
  }
}

/**
 * Format keywords as JSON string for database storage
 */
export function formatKeywordsForStorage(keywords: any): string {
  if (Array.isArray(keywords)) {
    return JSON.stringify(keywords)
  } else if (typeof keywords === 'string') {
    // Handle comma-separated string
    const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
    return JSON.stringify(keywordArray)
  } else {
    return JSON.stringify([])
  }
}
