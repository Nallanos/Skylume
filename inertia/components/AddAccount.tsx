import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Alert, AlertTitle, AlertDescription } from './ui/alert'
import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Key, ShieldCheck, Loader, UserPlus } from 'lucide-react'

function AddAccount() {
  const [tokenAppPassword, setTokenAppPassword] = useState('')
  const [bksySocial, setBksySocial] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { props } = usePage()
  const errors = props.errors as Record<string, string> | undefined

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    router.put(
      '/account',
      {
        bksy_social: bksySocial,
        token_app_password: tokenAppPassword,
        remember_me: rememberMe,
      },
      {
        onFinish: () => setIsLoading(false),
      }
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-blue-600 bg-clip-text text-transparent">
          Connect Your Bluesky Account
        </h1>
        <p className="text-lg">
          Grant us limited access to your Bluesky account using an app password. To do this, go to
          Bluesky and follow the steps below:
        </p>
      </div>

      {/* Steps Container */}
      <div className="space-y-12">
        {/* Step 1 */}
        <Card className="hover:border-blue-400 transition-colors">
          <CardHeader className="flex flex-row items-center space-x-4">
            <div className="p-3 bg-blue-400/10 rounded-full">
              <Key className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Step 1: Create App Password</CardTitle>
              <p className="text-muted-foreground">
                Settings → Privacy and security → App Passwords
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6 items-center">
            <div className="space-y-2">
              <p>
                1. Enable <strong>Direct Messages</strong> access
                <br />
                2. Copy generated token
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className="hover:border-purple-400 transition-colors">
          <CardHeader className="flex flex-row items-center space-x-4">
            <div className="p-3 bg-purple-400/10 rounded-full">
              <ShieldCheck className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Step 2: Authorize Access</CardTitle>
              <p className="text-muted-foreground">Securely link your account</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {errors?.credentials && (
              <Alert variant="destructive" className="text-red-600">
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>{errors.credentials}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Bluesky Handle</h3>
                <div className="flex items-center rounded-md bg-background border border-input text-foreground focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
                  <span className="pl-2"> @ </span>
                  <Input
                    value={bksySocial}
                    onChange={(e) => setBksySocial(e.target.value)}
                    placeholder="yourhandle.bsky.social"
                    required
                    className="flex items-center bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">App Password</h3>
                <Input
                  type="password"
                  value={tokenAppPassword}
                  onChange={(e) => setTokenAppPassword(e.target.value)}
                  placeholder="Paste your token here"
                  required
                  className="bg-background border-input text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                />
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember_me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="remember_me"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Keep me signed in for 2 years
                </label>
              </div>

              <Button type="submit" className="w-full group" disabled={isLoading}>
                {isLoading ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
                )}
                Secure Connection
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AddAccount
