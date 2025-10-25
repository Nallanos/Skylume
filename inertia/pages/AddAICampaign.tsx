import { Head, usePage, Link, useForm } from '@inertiajs/react'
import { useState } from 'react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { 
  MessageSquare, 
  Plus, 
  X,
  Brain,
  ArrowLeft,
  Lightbulb
} from 'lucide-react'

interface User {
  id: number
  email: string
}

interface Account {
  id: number
  handle: string
  displayName: string
}

interface PageProps {
  user: User
  accounts: Account[]
  [key: string]: any
}

function AddAICampaign() {
  const { user, accounts } = usePage<PageProps>().props
  const [keywords, setKeywords] = useState<string[]>([])
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [excludeKeywordInput, setExcludeKeywordInput] = useState('')

  const { data, setData, post, processing, errors } = useForm({
    name: '',
    accountHandle: '',
    strategy: 'semantic_analysis',
    keywords: [] as string[],
    excludeKeywords: [] as string[],
    interestedThreshold: 0.49,
    moderatelyInterestedThreshold: 0.35,
    message: '', // Default message empty - will be configured in the dashboard
    explicitLinks: [] as string[], // Liens explicites vides par défaut
  })

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      const newKeywords = [...keywords, keywordInput.trim()]
      setKeywords(newKeywords)
      setData('keywords', newKeywords)
      setKeywordInput('')
    }
  }

  const handleAddExcludeKeyword = () => {
    if (excludeKeywordInput.trim() && !excludeKeywords.includes(excludeKeywordInput.trim())) {
      const newExcludeKeywords = [...excludeKeywords, excludeKeywordInput.trim()]
      setExcludeKeywords(newExcludeKeywords)
      setData('excludeKeywords', newExcludeKeywords)
      setExcludeKeywordInput('')
    }
  }

  const handleRemoveKeyword = (keyword: string) => {
    const newKeywords = keywords.filter(k => k !== keyword)
    setKeywords(newKeywords)
    setData('keywords', newKeywords)
  }

  const handleRemoveExcludeKeyword = (keyword: string) => {
    const newExcludeKeywords = excludeKeywords.filter(k => k !== keyword)
    setExcludeKeywords(newExcludeKeywords)
    setData('excludeKeywords', newExcludeKeywords)
  }

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  const handleExcludeKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddExcludeKeyword()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/campaign/create')
  }

  const exampleKeywords = [
    'AI', 'machine learning', 'startup', 'entrepreneur', 'tech', 'developer',
    'marketing', 'business', 'innovation', 'digital', 'product manager'
  ]

  const exampleExcludeKeywords = [
    'competitor', 'spam', 'bot', 'fake', 'scam', 'politics'
  ]

  return (
    <>
      <Head title="Create AI DM Campaign" />
      <Layout user={user}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/campaign">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Campaigns
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Create AI DM Campaign
              </h1>
              <p className="text-muted-foreground mt-1">
                Set up an AI-powered campaign with semantic targeting
              </p>
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <Lightbulb className="h-4 w-4 inline mr-1" />
                  <strong>New:</strong> Messages and targeting groups will be configured in the dashboard after analysis is complete.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Campaign Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Campaign Name</Label>
                    <Input
                      id="name"
                      value={data.name}
                      onChange={(e) => setData('name', e.target.value)}
                      placeholder="e.g., Tech Entrepreneurs Outreach"
                      className="mt-1"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="account">Bluesky Account</Label>
                    <Select 
                      value={data.accountHandle} 
                      onValueChange={(value) => setData('accountHandle', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts && accounts.map((account) => (
                          <SelectItem key={account.id} value={account.handle}>
                            @{account.handle} ({account.displayName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.accountHandle && (
                      <p className="text-sm text-red-600 mt-1">{errors.accountHandle}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* AI Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Targeting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="keywords">Target Keywords</Label>
                    <div className="mt-1 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyPress={handleKeywordKeyPress}
                          placeholder="Add a keyword..."
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          onClick={handleAddKeyword}
                          variant="outline"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {keywords.map((keyword) => (
                            <Badge 
                              key={keyword} 
                              variant="secondary" 
                              className="cursor-pointer hover:bg-red-100"
                              onClick={() => handleRemoveKeyword(keyword)}
                            >
                              {keyword}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      AI will analyze follower bios for semantic similarity to these keywords
                    </p>
                    {errors.keywords && (
                      <p className="text-sm text-red-600 mt-1">{errors.keywords}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Keyword Suggestions
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {exampleKeywords.map((keyword) => (
                        <Badge 
                          key={keyword}
                          variant="outline" 
                          className="cursor-pointer hover:bg-blue-50"
                          onClick={() => {
                            if (!keywords.includes(keyword)) {
                              const newKeywords = [...keywords, keyword]
                              setKeywords(newKeywords)
                              setData('keywords', newKeywords)
                            }
                          }}
                        >
                          {keyword}
                          <Plus className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Exclude Keywords Section */}
                  <div className="border-t pt-4">
                    <Label htmlFor="excludeKeywords">Exclude Keywords (Optional)</Label>
                    <div className="mt-1 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={excludeKeywordInput}
                          onChange={(e) => setExcludeKeywordInput(e.target.value)}
                          onKeyPress={handleExcludeKeywordKeyPress}
                          placeholder="Add a keyword to exclude..."
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          onClick={handleAddExcludeKeyword}
                          variant="outline"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {excludeKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {excludeKeywords.map((keyword) => (
                            <Badge 
                              key={keyword} 
                              variant="destructive" 
                              className="cursor-pointer hover:bg-red-200"
                              onClick={() => handleRemoveExcludeKeyword(keyword)}
                            >
                              {keyword}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Followers matching these keywords will be automatically excluded from targeting
                    </p>
                    
                    <div className="mt-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <X className="h-4 w-4 text-red-500" />
                        Exclude Suggestions
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {exampleExcludeKeywords.map((keyword) => (
                          <Badge 
                            key={keyword}
                            variant="outline" 
                            className="cursor-pointer hover:bg-red-50 border-red-200"
                            onClick={() => {
                              if (!excludeKeywords.includes(keyword)) {
                                const newExcludeKeywords = [...excludeKeywords, keyword]
                                setExcludeKeywords(newExcludeKeywords)
                                setData('excludeKeywords', newExcludeKeywords)
                              }
                            }}
                          >
                            {keyword}
                            <Plus className="h-3 w-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Advanced Settings - AI Thresholds */}
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <Brain className="h-5 w-5" />
                  Advanced AI Settings
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Customize similarity thresholds for follower categorization (optional)
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="interestedThreshold">
                      Interested Threshold
                    </Label>
                    <Input
                      id="interestedThreshold"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={data.interestedThreshold}
                      onChange={(e) => setData('interestedThreshold', parseFloat(e.target.value) || 0.49)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 0.49 (49% similarity) - Higher values require stronger keyword match
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="moderatelyInterestedThreshold">
                      Moderately Interested Threshold
                    </Label>
                    <Input
                      id="moderatelyInterestedThreshold"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={data.moderatelyInterestedThreshold}
                      onChange={(e) => setData('moderatelyInterestedThreshold', parseFloat(e.target.value) || 0.35)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 0.35 (35% similarity) - Minimum similarity for potential interest
                    </p>
                  </div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    💡 <strong>Pro tip:</strong> Lower thresholds cast a wider net but may include less relevant followers. 
                    Higher thresholds are more selective but may miss potential matches.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* How it Works */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                  How AI Targeting Works
                </h3>
                <div className="grid md:grid-cols-4 gap-4 text-sm text-blue-800 dark:text-blue-200">
                  <div>
                    <div className="font-medium mb-1">1. Exclusion Check</div>
                    <div>First checks if bio matches exclude keywords to filter out unwanted profiles</div>
                  </div>
                  <div>
                    <div className="font-medium mb-1">2. Interest Analysis</div>
                    <div>AI analyzes remaining follower bios using semantic similarity</div>
                  </div>
                  <div>
                    <div className="font-medium mb-1">3. Interest Scoring</div>
                    <div>Categorizes users as interested, moderate, not interested, or excluded</div>
                  </div>
                  <div>
                    <div className="font-medium mb-1">4. Smart Targeting</div>
                    <div>Messages sent to most relevant followers first, excluding filtered profiles</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Link href="/campaign">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={processing || keywords.length === 0}>
                {processing ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </form>
        </div>
      </Layout>
    </>
  )
}

export default AddAICampaign
