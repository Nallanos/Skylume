import { Head, router } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Settings, User as UserIcon, Shield } from 'lucide-react'
import { useState } from 'react'

interface ProfileProps {
  user: any
}

function Profile({ user }: ProfileProps) {
  const [email, setEmail] = useState(user?.email || '')
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)

  const handleUpdateEmail = async () => {
    if (!email.trim() || email === user?.email) return
    
    setIsUpdatingEmail(true)
    try {
      await router.put('/profile/update-email', { email })
      // The backend will handle the redirect
    } catch (error) {
      console.error('Failed to update email:', error)
    } finally {
      setIsUpdatingEmail(false)
    }
  }
  return (
    <>
      <Head title="Profile Settings" />
      <Layout user={user}>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
              <p className="text-muted-foreground">Manage your account settings and preferences</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                    />
                    <Button 
                      onClick={handleUpdateEmail}
                      disabled={isUpdatingEmail || !email.trim() || email === user?.email}
                      size="sm"
                    >
                      {isUpdatingEmail ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user?.email ? 'Update your email address' : 'Set your email address for notifications'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="plan">Current Plan</Label>
                  <Input
                    id="plan"
                    value={user?.plan || 'Free'}
                    disabled
                    className="bg-muted capitalize"
                  />
                </div>

                <Button variant="outline" className="w-full">
                  Change Password
                </Button>
              </CardContent>
            </Card>

            {/* Plan Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 capitalize">
                        {user?.plan || 'Free'} Plan
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {user?.plan === 'pro' ? 'All features unlocked' : 'Limited features'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        {user?.plan === 'pro' ? '$29' : '$0'}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">/month</div>
                    </div>
                  </div>
                </div>

                {user?.plan !== 'pro' && (
                  <Button className="w-full" asChild>
                    <a href="/plan/change">Upgrade to Pro</a>
                  </Button>
                )}

                {user?.plan === 'pro' && (
                  <Button variant="outline" className="w-full">
                    Manage Subscription
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about your accounts
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Data Export</Label>
                    <p className="text-sm text-muted-foreground">Download your data</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Delete Account</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete your account and all associated data. This action cannot be
                    undone.
                  </p>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      if (
                        confirm(
                          'Are you sure you want to delete your account? This action is irreversible.'
                        )
                      ) {
                        // This will be handled by the sidebar component or we can implement it here
                        window.location.href = '/delete-account-confirmation'
                      }
                    }}
                  >
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </>
  )
}

export default Profile
