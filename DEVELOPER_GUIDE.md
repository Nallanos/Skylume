# Campaign State Management - Developer Guide

## Quick Start

### Running the Migration
```bash
# 1. Apply the database schema
node ace migration:run

# 2. Migrate existing data from boolean flags to enum
node ace migrate:campaign-states

# 3. Validate the new system
node ace validate:campaign-states
```

### Using the New State System

#### In Controllers/Services
```typescript
// ✅ DO: Use new state methods
if (campaign.canStart()) {
    await campaign.transitionToRunning()
}

if (campaign.isRunning()) {
    // Campaign is currently executing
}

// ❌ DON'T: Use old boolean flags (deprecated)
campaign.shouldStop = true  // Will be removed after migration
```

#### State Transitions
```typescript
// Valid transitions
await campaign.transitionToRunning()    // stopped/paused/failed -> running
await campaign.transitionToPaused()     // running -> paused  
await campaign.transitionToStopped()    // running/paused -> stopped
await campaign.transitionToCompleted()  // running -> completed
await campaign.transitionToFailed()     // any -> failed

// Invalid transitions throw errors
try {
    await campaign.transitionToPaused() // when not running
} catch (error) {
    console.log(error.message) // "Cannot pause campaign in state: stopped"
}
```

#### Frontend State Handling
```typescript
// ✅ DO: Check unified state first, fallback to old status
const currentState = executionStatus.state || executionStatus.status

if (currentState === 'running') {
    // Show pause/stop buttons
}

// ✅ DO: Use backward-compatible checks during migration
const isRunning = (executionStatus.state === 'running') || 
                  (!executionStatus.state && executionStatus.status === 'running')
```

## State Definitions

| State | Description | Can Transition To |
|-------|-------------|-------------------|
| `stopped` | Campaign is not executing | `running` |
| `running` | Campaign is actively sending messages | `paused`, `stopped`, `completed`, `failed` |
| `paused` | Campaign execution temporarily halted | `running`, `stopped` |
| `stopping` | Campaign is in process of stopping | `stopped` |
| `completed` | Campaign finished successfully | `running` (restart) |
| `failed` | Campaign failed due to error | `running` (retry) |

## Debugging

### Check Current State
```typescript
console.log('Current state:', campaign.executionState)
console.log('Can start:', campaign.canStart())
console.log('Is running:', campaign.isRunning())
```

### Legacy Compatibility
During migration, both old and new fields are synchronized:
```typescript
// These should match during migration period
console.log('New state:', campaign.executionState)
console.log('Old status:', campaign.executionStatus)
console.log('Should stop:', campaign.shouldStop)
console.log('Should pause:', campaign.shouldPause)
```

## Common Patterns

### Starting a Campaign
```typescript
try {
    if (!campaign.canStart()) {
        throw new Error(`Campaign cannot be started in state: ${campaign.executionState}`)
    }
    
    await campaign.transitionToRunning()
    // Set execution parameters
    campaign.executionProgress = 0
    campaign.executionTargetCount = targetCount
    await campaign.save()
    
} catch (error) {
    console.error('Failed to start campaign:', error.message)
}
```

### Execution Loop (Fixed Race Condition)
```typescript
while (campaign.isRunning()) {
    await campaign.refresh() // Get latest state
    
    // Single source of truth - no more race conditions
    if (campaign.isStopped() || campaign.isPaused()) {
        break
    }
    
    // Send message...
    await sendMessage()
}
```

### Handling User Actions
```typescript
// Pause button click
if (campaign.canPause()) {
    await campaign.transitionToPaused()
    updateUI('paused')
}

// Resume button click  
if (campaign.canResume()) {
    await campaign.transitionToRunning()
    updateUI('running')
}
```

## Migration Checklist

- [ ] Database migration applied
- [ ] Data migration completed (`migrate:campaign-states`)
- [ ] Validation tests pass (`validate:campaign-states`)
- [ ] Frontend updated to use new state system
- [ ] All controllers using new transition methods
- [ ] Auto-pause bug verified as fixed
- [ ] Old boolean fields can be removed (future cleanup)