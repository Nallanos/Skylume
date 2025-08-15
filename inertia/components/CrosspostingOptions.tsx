import React from 'react'
import { Checkbox } from './ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Twitter, MessageCircle, Loader2 } from 'lucide-react'

interface CrosspostingOptionsProps {
  enableCrosspost: boolean
  selectedPlatforms: string[]
  connectedAccounts: {
    twitter?: boolean
    threads?: boolean
  }
  onEnableCrosspostChange: (enabled: boolean) => void
  onPlatformChange: (platform: string, enabled: boolean) => void
  twitterRateLimit?: boolean
  threadsRateLimit?: boolean
}

const CrosspostingOptions: React.FC<CrosspostingOptionsProps> = ({
  enableCrosspost,
  selectedPlatforms,
  connectedAccounts,
  onEnableCrosspostChange,
  onPlatformChange,
  twitterRateLimit = false,
  threadsRateLimit = false
}) => {
  const platforms = [
    {
      id: 'bluesky',
      name: 'Bluesky',
      icon: '🌌',
      connected: true, // Always connected for primary account
      rateLimit: false,
      description: 'Primary platform'
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      icon: Twitter,
      connected: connectedAccounts.twitter || false,
      rateLimit: twitterRateLimit,
      description: '280 character limit'
    },
    {
      id: 'threads',
      name: 'Threads',
      icon: MessageCircle,
      connected: connectedAccounts.threads || false,
      rateLimit: threadsRateLimit,
      description: '500 character limit'
    }
  ]

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Crosspost Settings</span>
          {enableCrosspost && selectedPlatforms.length > 1 && (
            <Badge variant="secondary">{selectedPlatforms.length} platforms</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable Crossposting Toggle */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="enable-crosspost"
            checked={enableCrosspost}
            onCheckedChange={onEnableCrosspostChange}
          />
          <label 
            htmlFor="enable-crosspost" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Enable crossposting to multiple platforms
          </label>
        </div>

        {/* Platform Selection */}
        {enableCrosspost && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select platforms to post to simultaneously:
            </p>
            
            {platforms.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.id)
              const canSelect = platform.connected && !platform.rateLimit
              
              return (
                <div 
                  key={platform.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isSelected ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                  } ${!canSelect ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`platform-${platform.id}`}
                      checked={isSelected}
                      disabled={!canSelect || platform.id === 'bluesky'} // Bluesky always enabled
                      onCheckedChange={(checked) => 
                        onPlatformChange(platform.id, checked as boolean)
                      }
                    />
                    
                    <div className="flex items-center space-x-2">
                      {typeof platform.icon === 'string' ? (
                        <span className="text-lg">{platform.icon}</span>
                      ) : (
                        <platform.icon className="h-4 w-4" />
                      )}
                      <span className="font-medium">{platform.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {platform.rateLimit && (
                      <Badge variant="destructive" className="text-xs">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Rate Limited
                      </Badge>
                    )}
                    
                    {!platform.connected && platform.id !== 'bluesky' && (
                      <Badge variant="outline" className="text-xs">
                        Not Connected
                      </Badge>
                    )}
                    
                    {platform.connected && !platform.rateLimit && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        Ready
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Connection Instructions */}
        {enableCrosspost && (!connectedAccounts.twitter || !connectedAccounts.threads) && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              💡 Connect additional accounts to enable crossposting:
            </p>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
              {!connectedAccounts.twitter && (
                <li>• Go to Settings → Connected Accounts → Add Twitter</li>
              )}
              {!connectedAccounts.threads && (
                <li>• Go to Settings → Connected Accounts → Add Threads</li>
              )}
            </ul>
          </div>
        )}

        {/* Character Limit Warning */}
        {enableCrosspost && selectedPlatforms.length > 1 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              ℹ️ Your message will be automatically truncated to fit each platform's character limits if needed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CrosspostingOptions
