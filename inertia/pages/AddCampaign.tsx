import { Head } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { MessageSquare, Target, Users } from 'lucide-react'

interface AddCampaignProps {
  user: any
}

function AddCampaign({ user }: AddCampaignProps) {
  return (
    <>
      <Head title="Create DM Campaign" />
      <Layout user={user}>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-600 dark:bg-purple-500 flex items-center justify-center text-white font-semibold shadow-sm">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Create DM Campaign</h1>
              <p className="text-muted-foreground">Set up automated direct message campaigns</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Campaign Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input id="campaign-name" placeholder="Enter campaign name" required />
                  </div>

                  <div>
                    <Label htmlFor="account-select">Bluesky Account</Label>
                    <select
                      id="account-select"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="">Select an account</option>
                      {/* Accounts will be populated here */}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="message-template">Message Template</Label>
                  <Textarea
                    id="message-template"
                    placeholder="Hi {name}, thanks for following! 👋"
                    rows={4}
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Use {'{name}'} to personalize messages with follower names
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="target-followers">Target Followers</Label>
                    <select
                      id="target-followers"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="new">New followers only</option>
                      <option value="active">Active followers</option>
                      <option value="all">All followers</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="daily-limit">Daily Message Limit</Label>
                    <Input id="daily-limit" type="number" placeholder="50" min="1" max="200" />
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <h3 className="font-medium text-blue-900 dark:text-blue-100">Pro Feature</h3>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    DM Campaigns are available for Pro users. Upgrade your plan to access automated
                    messaging features.
                  </p>
                  {user?.plan !== 'pro' && (
                    <Button className="mt-3" size="sm" asChild>
                      <a href="/plan/change">Upgrade to Pro</a>
                    </Button>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={user?.plan !== 'pro'}>
                    Create Campaign
                  </Button>
                  <Button type="button" variant="outline">
                    Save as Draft
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  )
}

export default AddCampaign
