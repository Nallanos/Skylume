// Example data structure for the PublicationCalendar component
// This shows the expected format for posting_days prop

export const samplePostingDays = [
  // Recent posts (last week)
  { date: '2025-06-28', count: 3 },
  { date: '2025-06-27', count: 1 },
  { date: '2025-06-26', count: 2 },
  { date: '2025-06-25', count: 1 },
  { date: '2025-06-23', count: 4 },
  { date: '2025-06-22', count: 2 },
  { date: '2025-06-21', count: 1 },
  
  // Previous week
  { date: '2025-06-20', count: 2 },
  { date: '2025-06-19', count: 1 },
  { date: '2025-06-18', count: 3 },
  { date: '2025-06-17', count: 1 },
  { date: '2025-06-16', count: 2 },
  { date: '2025-06-14', count: 1 },
  { date: '2025-06-13', count: 2 },
  
  // Month ago
  { date: '2025-05-28', count: 1 },
  { date: '2025-05-27', count: 3 },
  { date: '2025-05-26', count: 2 },
  { date: '2025-05-25', count: 1 },
  { date: '2025-05-24', count: 2 },
  { date: '2025-05-23', count: 1 },
  { date: '2025-05-22', count: 4 },
  
  // Older posts scattered throughout the year
  { date: '2025-04-15', count: 2 },
  { date: '2025-04-14', count: 1 },
  { date: '2025-04-10', count: 3 },
  { date: '2025-03-28', count: 1 },
  { date: '2025-03-25', count: 2 },
  { date: '2025-03-20', count: 1 },
  { date: '2025-02-14', count: 5 }, // Valentine's Day - lots of posts
  { date: '2025-01-01', count: 3 }, // New Year
  { date: '2024-12-25', count: 2 }, // Christmas
  { date: '2024-12-31', count: 4 }, // New Year's Eve
  
  // Summer activity
  { date: '2024-08-15', count: 2 },
  { date: '2024-08-10', count: 3 },
  { date: '2024-08-05', count: 1 },
  { date: '2024-07-20', count: 2 },
  { date: '2024-07-15', count: 1 },
  { date: '2024-07-10', count: 2 },
  { date: '2024-07-04', count: 4 }, // Independence Day
]

// Function to generate random posting data for testing
export const generateRandomPostingDays = (daysBack = 365) => {
  const data = []
  const now = new Date()
  
  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    
    // Simulate posting patterns
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const baseChance = isWeekend ? 0.2 : 0.6 // Less likely to post on weekends
    
    if (Math.random() < baseChance) {
      const count = Math.floor(Math.random() * 6) + 1 // 1-6 posts
      data.push({
        date: date.toISOString().split('T')[0],
        count: count
      })
    }
  }
  
  return data
}

// Expected intensity levels based on post count:
// 0 posts = intensity 0 (gray)
// 1 post = intensity 1 (light green)
// 2-3 posts = intensity 2 (medium green)
// 4-5 posts = intensity 3 (darker green)
// 6+ posts = intensity 4 (darkest green)
