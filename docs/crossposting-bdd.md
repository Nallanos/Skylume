# Crossposting Feature BDD Specification

## Feature: Multi-Platform Content Crossposting

**As a** social media manager  
**I want to** schedule posts to multiple platforms simultaneously  
**So that** I can reach my audience across different social networks efficiently

---

## Scenario 1: User enables crossposting for the first time

**Given** I am a logged-in user with a Bluesky account connected  
**And** I am on the schedule post page  
**When** I enable crossposting  
**Then** I should see platform options for Twitter, Threads, and Bluesky  
**And** Bluesky should be automatically selected and cannot be disabled  
**And** Twitter and Threads should show "Not Connected" status  
**And** I should see instructions on how to connect additional accounts

## Scenario 2: User connects Twitter account

**Given** I am on the connected accounts settings page  
**When** I click "Connect Twitter"  
**Then** I should be redirected to Twitter's OAuth page  
**And** after granting permission  
**Then** I should be redirected back to the settings page  
**And** I should see "Twitter account @username connected successfully"  
**And** Twitter should now show "Ready" status in crossposting options

## Scenario 3: User schedules a crosspost to multiple platforms

**Given** I have connected accounts for Twitter and Threads  
**And** I am on the schedule post page  
**And** I have enabled crossposting  
**When** I select Bluesky, Twitter, and Threads as target platforms  
**And** I write a post with 250 characters  
**And** I set a future schedule time  
**And** I click "Schedule Post"  
**Then** the post should be saved with crossposting enabled  
**And** I should see "Post scheduled for 3 platforms"  
**And** at the scheduled time, the post should be published to all selected platforms

## Scenario 4: Character limit handling across platforms

**Given** I have crossposting enabled for Twitter and Bluesky  
**When** I write a post with 350 characters  
**Then** I should see a warning that the post exceeds Twitter's 280 character limit  
**And** when posted, the Twitter version should be truncated to 277 characters + "..."  
**And** the Bluesky version should be truncated to 297 characters + "..."

## Scenario 5: Platform-specific failures are handled gracefully

**Given** I have a scheduled crosspost for Twitter and Bluesky  
**And** my Twitter account gets rate limited  
**When** the post execution time arrives  
**Then** the post should successfully publish to Bluesky  
**And** the Twitter post should fail with a rate limit error  
**And** I should receive a notification about the partial failure  
**And** the overall status should show "Partially Posted"

## Scenario 6: Media handling across platforms

**Given** I have crossposting enabled for multiple platforms  
**When** I upload 3 images to a post  
**Then** all platforms should receive the images  
**When** I upload a video  
**Then** platforms that support video should receive it  
**And** platforms that don't support video should receive only the text

## Scenario 7: Rate limit detection and prevention

**Given** my Twitter account is currently rate limited  
**When** I try to schedule a crosspost including Twitter  
**Then** I should see a warning that Twitter is rate limited  
**And** Twitter should appear as disabled in the platform selection  
**And** I should be able to proceed with other platforms only

## Scenario 8: Disconnecting accounts

**Given** I have connected Twitter and Threads accounts  
**When** I go to connected accounts settings  
**And** I click "Disconnect" for Twitter  
**Then** I should see "Twitter account disconnected successfully"  
**And** Twitter should no longer appear as available in crossposting options  
**And** any scheduled crossposts including Twitter should be updated

---

## Acceptance Criteria

### Platform Support
- ✅ Support for Bluesky (primary platform)
- ✅ Support for X (Twitter) via API v2
- ✅ Support for Meta Threads via API
- ✅ Extensible architecture for future platforms

### Authentication & Security
- ✅ OAuth 2.0 flow for Twitter
- ✅ OAuth 2.0 flow for Threads  
- ✅ Secure token storage
- ✅ Token refresh handling
- ✅ Account disconnection functionality

### Content Management
- ✅ Character limit validation per platform
- ✅ Automatic text truncation when needed
- ✅ Media upload support (images/videos)
- ✅ Alt text support where available
- ✅ Content warning/label support

### Scheduling & Execution
- ✅ Multi-platform scheduling
- ✅ Individual platform success/failure tracking
- ✅ Retry logic for failed posts
- ✅ Rate limit detection and handling
- ✅ Background job processing

### User Experience
- ✅ Intuitive platform selection UI
- ✅ Clear connection status indicators
- ✅ Helpful error messages and warnings
- ✅ Progress tracking and notifications
- ✅ Settings management interface

### Monitoring & Analytics
- ✅ Platform-specific post tracking
- ✅ Success/failure analytics
- ✅ Rate limit monitoring
- ✅ Performance metrics

---

## Edge Cases Handled

1. **Network failures**: Retry logic with exponential backoff
2. **API changes**: Graceful degradation and error reporting
3. **Token expiration**: Automatic refresh and user notification
4. **Platform outages**: Isolated failure handling
5. **Character encoding**: Unicode support across platforms
6. **Media format compatibility**: Platform-specific format conversion
7. **Concurrent posting limits**: Queue management and throttling

---

## Testing Strategy

### Unit Tests
- Service layer methods for each platform
- Character limit validation logic
- Token management functions
- Content formatting utilities

### Integration Tests
- End-to-end OAuth flows
- Database operations
- Job queue processing
- API interactions (with mocks)

### E2E Tests
- Complete user workflows
- Multi-platform posting scenarios
- Error handling paths
- Settings management flows

### Performance Tests
- Concurrent posting load
- Large media file handling
- Database query optimization
- Memory usage during batch operations
