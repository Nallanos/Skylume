// Simple test to verify streak logic
const { DateTime } = require('luxon')

// Mock user object
const mockUser = {
  currentStreak: 0,
  longestStreak: 0,
  lastPostDate: null,
  streakStartDate: null
}

// Test streak calculation logic
function calculateNewStreak(user, postDate) {
  const lastPostDate = user.lastPostDate?.startOf ? user.lastPostDate.startOf('day') : null
  
  let currentStreak = 1
  let streakStartDate = postDate
  
  if (lastPostDate) {
    // If posting on the same day, maintain current streak
    if (lastPostDate.equals(postDate)) {
      return {
        currentStreak: user.currentStreak || 1,
        longestStreak: user.longestStreak || 1,
        streakStartDate: user.streakStartDate || postDate
      }
    }
    
    // If posting on consecutive days, increment streak
    if (isConsecutiveDay(lastPostDate, postDate)) {
      currentStreak = (user.currentStreak || 0) + 1
      streakStartDate = user.streakStartDate || postDate
    } else {
      // Streak is broken, start new streak
      currentStreak = 1
      streakStartDate = postDate
    }
  }
  
  return {
    currentStreak,
    longestStreak: Math.max(currentStreak, user.longestStreak || 0),
    streakStartDate
  }
}

function isConsecutiveDay(lastDate, currentDate) {
  const daysDiff = Math.abs(currentDate.diff(lastDate, 'days').days)
  return daysDiff === 1
}

// Test cases
console.log('Testing streak logic...')

// Test 1: First post
const today = DateTime.now().startOf('day')
let result = calculateNewStreak(mockUser, today)
console.log('Test 1 - First post:', result)

// Test 2: Second post next day
mockUser.currentStreak = 1
mockUser.longestStreak = 1
mockUser.lastPostDate = today
mockUser.streakStartDate = today

const tomorrow = today.plus({ days: 1 })
result = calculateNewStreak(mockUser, tomorrow)
console.log('Test 2 - Next day post:', result)

// Test 3: Broken streak (posting after 3 days)
const threeDaysLater = today.plus({ days: 3 })
result = calculateNewStreak(mockUser, threeDaysLater)
console.log('Test 3 - Broken streak:', result)

console.log('✅ Streak logic tests completed!')
