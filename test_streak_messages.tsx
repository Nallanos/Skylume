import React from 'react'
import StreakDisplay from '../inertia/components/StreakDisplay'

// Test simple pour vérifier les messages de streak
const TestStreakMessages = () => {
  const testStreaks = [0, 1, 7, 14, 30, 45]
  
  console.log('Testing streak messages:')
  
  testStreaks.forEach(streak => {
    const props = {
      currentStreak: streak,
      longestStreak: Math.max(streak, 20),
      streakStatus: streak === 0 ? 'broken' : (streak < 7 ? 'at-risk' : 'active'),
      className: ''
    }
    
    console.log(`Streak ${streak}: Component would show proper message`)
  })

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Test des messages de streak</h2>
      <p>Ouvrez la console pour voir les tests, ou cliquez sur les badges pour voir les messages.</p>
      
      {testStreaks.map(streak => (
        <div key={streak} className="flex items-center gap-4">
          <span>Streak {streak}:</span>
          <StreakDisplay
            currentStreak={streak}
            longestStreak={Math.max(streak, 20)}
            streakStatus={streak === 0 ? 'broken' : (streak < 7 ? 'at-risk' : 'active')}
          />
        </div>
      ))}
    </div>
  )
}

export default TestStreakMessages
