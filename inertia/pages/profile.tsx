import { Head, router } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Settings, Shield } from 'lucide-react'

interface ProfileProps {
  user: any
}

function Profile({ user }: ProfileProps) {
  const handleCustomerPortal = async () => {
    try {
      await router.post('/customer-portal')
    } catch (error) {
      console.error('Error accessing customer portal:', error)
    }
  }

  const handleCancelSubscription = async () => {
    if (confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      try {
        await router.post('/cancel-subscription')
      } catch (error) {
        console.error('Error cancelling subscription:', error)
      }
    }
  }

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action is irreversible and will also cancel any active subscriptions.')) {
      router.delete('/delete')
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
                        {user?.plan === 'pro' ? '€10/month - All features unlocked' : 
                         user?.plan === 'business' ? '€19/month - Business features' : 
                         'Limited features'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        {user?.plan === 'pro' ? '€10' : 
                         user?.plan === 'business' ? '€19' : 
                         '€0'}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">/month</div>
                    </div>
                  </div>
                </div>

                {(!user?.plan || user?.plan === 'free') && (
                  <Button className="w-full" asChild>
                    <a href="/pricing">Upgrade Plan</a>
                  </Button>
                )}

                {(user?.plan === 'pro' || user?.plan === 'business') && (
                  <div className="space-y-3">
                    <Button 
                      variant="destructive" 
                      className="w-full" 
                      onClick={handleCancelSubscription}
                    >
                      Cancel Subscription
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Delete Account</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete your account and all associated data. This action cannot be
                    undone. Any active subscriptions will be automatically cancelled.
                  </p>
                  <Button
                    variant="destructive"
                    className="w-full max-w-sm"
                    onClick={handleDeleteAccount}
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
