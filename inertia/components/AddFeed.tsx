import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Plus, Loader, Hash, X, Info, AlertTriangle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import * as Tooltip from '@radix-ui/react-tooltip'

interface Account {
  id: number
  handle: string
  displayName: string
}

interface AddFeedProps {
  accounts: Account[]
  isFirstFeed?: boolean
  onCancel?: () => void
}

export default function AddFeed({ accounts, isFirstFeed = false, onCancel }: AddFeedProps) {
  const [selectedAccount, setSelectedAccount] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleAddKeyword = () => {
    if (!keywordInput.trim()) return
    
    // Format keyword: remove spaces, convert to lowercase
    const formattedKeyword = keywordInput.trim().toLowerCase()
    
    // Avoid duplicates
    if (!keywords.includes(formattedKeyword) && formattedKeyword) {
      setKeywords([...keywords, formattedKeyword])
      setKeywordInput('')
    }
  }

  const handleRemoveKeyword = (indexToRemove: number) => {
    setKeywords(keywords.filter((_, index) => index !== indexToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  async function createFeed() {
    if (!selectedAccount || keywords.length === 0) return

    setIsLoading(true)
    try {
      router.post('/feed/create', {
        account_id: selectedAccount,
        keywords: keywords.join(','),
      }, {
        onSuccess: () => {
          // Reset form
          setSelectedAccount('')
          setKeywords([])
          setKeywordInput('')
          
          // Hide the create form immediately after successful creation
          if (onCancel) {
            onCancel()
          }
        },
        onError: (error) => {
          console.error('Error creating feed:', error)
        },
        onFinish: () => {
          setIsLoading(false)
        }
      })
    } catch (error) {
      console.error('Error creating feed:', error)
      setIsLoading(false)
    }
  }

  const getPerformanceWarning = () => {
    if (keywords.length === 0) return null
    if (keywords.length === 1) return { type: 'good', message: 'Optimal performance - 1 keyword' }
    if (keywords.length <= 3) return { type: 'warning', message: 'Good performance - few keywords' }
    return { type: 'danger', message: 'Slower performance - many keywords' }
  }

  const performanceWarning = getPerformanceWarning()

  if (isFirstFeed) {
    return (
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white mb-6 mx-auto">
            <Hash className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-4">
            Create Your First Feed
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Create custom feeds to track specific keywords and hashtags across Bluesky. Monitor
            conversations, competitors, and trends that matter to your brand.
          </p>
        </header>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Create Feed
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content className="bg-popover text-popover-foreground p-2 rounded-md shadow-md text-sm max-w-xs">
                      <p className="mb-2">⚡ <strong>Performance tip:</strong></p>
                      <p>We recommend using only <strong>1 keyword</strong> for optimal speed. More keywords = slower processing.</p>
                      <Tooltip.Arrow className="fill-popover" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="account">Select Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      @{account.handle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="keywords">Keywords</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="keywords"
                    placeholder="e.g., bluesky, socialmedia, hashtag"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddKeyword}
                    disabled={!keywordInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md">
                    {keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {keyword}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(index)}
                          className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {performanceWarning && (
                  <div className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                    performanceWarning.type === 'good' ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' :
                    performanceWarning.type === 'warning' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' :
                    'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                  }`}>
                    {performanceWarning.type === 'danger' && <AlertTriangle className="h-4 w-4" />}
                    {performanceWarning.message}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Add keywords one by one. Spaces will be removed automatically.
                </p>
              </div>
            </div>

            <Button
              onClick={createFeed}
              disabled={isLoading || !selectedAccount || keywords.length === 0}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Feed
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Create New Feed
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="bg-popover text-popover-foreground p-2 rounded-md shadow-md text-sm max-w-xs">
                  <p className="mb-2">⚡ <strong>Performance tip:</strong></p>
                  <p>We recommend using only <strong>1 keyword</strong> for optimal speed. More keywords = slower processing.</p>
                  <Tooltip.Arrow className="fill-popover" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="account">Select Account</Label>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Choose an account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id.toString()}>
                  @{account.handle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="keywords">Keywords</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                id="keywords"
                placeholder="e.g., bluesky, socialmedia, hashtag"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddKeyword}
                disabled={!keywordInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md">
                {keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(index)}
                      className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {performanceWarning && (
              <div className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                performanceWarning.type === 'good' ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' :
                performanceWarning.type === 'warning' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' :
                'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
              }`}>
                {performanceWarning.type === 'danger' && <AlertTriangle className="h-4 w-4" />}
                {performanceWarning.message}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Add keywords one by one. Spaces will be removed automatically.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={createFeed}
            disabled={isLoading || !selectedAccount || keywords.length === 0}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Feed
              </>
            )}
          </Button>

          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
