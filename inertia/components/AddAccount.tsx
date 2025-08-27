import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Alert, AlertTitle, AlertDescription } from './ui/alert'
import { useState, useRef, useEffect } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Key, ShieldCheck, Loader, UserPlus, AtSign, User } from 'lucide-react'
import { useHandleAutocomplete } from '../hooks/useHandleAutocomplete'

interface Actor {
  handle: string
  displayName: string
  avatar?: string
  description?: string
  followersCount: number
}

function AddAccount() {
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [passwordType, setPasswordType] = useState<'app_password' | 'regular_password'>('app_password')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
  const { suggestions, isLoading: isSearching, searchHandles, clearSuggestions } = useHandleAutocomplete()
  
  const { props } = usePage()
  const errors = props.errors as Record<string, string> | undefined

  // Handle input changes with debounced search
  const handleInputChange = (value: string) => {
    setHandle(value)
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    // Show suggestions dropdown
    setShowSuggestions(true)
    
    // Debounce search
    const timeout = setTimeout(() => {
      searchHandles(value)
    }, 300)
    
    setSearchTimeout(timeout)
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: Actor) => {
    setHandle(suggestion.handle)
    setShowSuggestions(false)
    clearSuggestions()
  }

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        suggestionsRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTimeout])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    router.put(
      '/account',
      {
        credential: handle.replace(/\s/g, ''),
        password: password,
        remember_me: rememberMe,
        auth_method: passwordType,
      },
      {
        onFinish: () => setIsLoading(false),
      }
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-blue-600 bg-clip-text text-transparent">
          Connect Your Bluesky Account
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Choose your preferred authentication method to get started
        </p>
      </div>

      {/* Main Connection Options */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* App Password Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Key className="h-4 w-4" />
              How to Create an App Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
                <span>Go to <strong>Settings</strong> in your Bluesky app</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                <span>Navigate to <strong>Privacy and Security</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold">3</span>
                <span>Find <strong>App Passwords</strong> section</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold">4</span>
                <span>Create a new app password for "Skynalytic"</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold">5</span>
                <span>Copy the generated password and paste it in the form</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection Form */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <AtSign className="h-5 w-5" />
              Connect Your Account
            </CardTitle>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Enter your Bluesky handle and password
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Handle Input with Autocomplete */}
              <div className="space-y-2 relative">
                <label className="text-sm font-medium flex items-center gap-2">
                  <AtSign className="h-4 w-4" />
                  Bluesky Handle
                </label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="yourname.bsky.social"
                    value={handle}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true)
                    }}
                    className="transition-all duration-200"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
                  >
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.handle}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                      >
                        {suggestion.avatar ? (
                          <img 
                            src={suggestion.avatar} 
                            alt={suggestion.displayName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {suggestion.displayName}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                            @{suggestion.handle}
                          </div>
                          {suggestion.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                              {suggestion.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Password Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Password Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="passwordType"
                      value="app_password"
                      checked={passwordType === 'app_password'}
                      onChange={(e) => setPasswordType(e.target.value as 'app_password' | 'regular_password')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">App Password</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="passwordType"
                      value="regular_password"
                      checked={passwordType === 'regular_password'}
                      onChange={(e) => setPasswordType(e.target.value as 'app_password' | 'regular_password')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Regular Password</span>
                  </label>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Password
                </label>
                <Input
                  type="password"
                  placeholder={
                    passwordType === 'app_password' 
                      ? 'xxxx-xxxx-xxxx-xxxxxx'
                      : 'Your regular password'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Remember Me */}
              <div className="flex items-center space-x-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-300">
                  Keep me signed in
                </label>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={isLoading || !handle || !password}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Connect Account
                  </>
                )}
              </Button>

              {/* Separator */}
              {/* <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-blue-50 dark:bg-blue-950 px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div> */}

              {/* OAuth Button
              <Button 
                type="button"
                onClick={handleOAuthLogin}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <AtSign className="h-4 w-4 mr-2" />
                    Connect with Bluesky
                  </>
                )}
              </Button> */}
            </form>
          </CardContent>
        </Card>
      </div>

            {/* Error Display */}
      {errors && Object.keys(errors).length > 0 && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-950">
          <AlertTitle className="text-red-800 dark:text-red-200">
            Connection Failed
          </AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-300">
            {Object.values(errors).map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default AddAccount
