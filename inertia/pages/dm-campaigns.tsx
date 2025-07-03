import { Head, usePage } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { MessageSquare, Users, TrendingUp, Plus } from 'lucide-react'

interface User {
  id: number
  email: string
}

function DMCampaigns() {
  const { props } = usePage()
  const user = props.user as User

  return (
    <>
      <Head title="DM Campaigns" />
      <Layout user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                DM Campaigns
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your direct message campaigns and outreach
              </p>
            </div>

            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>

          {/* Coming Soon Section */}
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white mb-6 mx-auto">
              <MessageSquare className="h-10 w-10" />
            </div>

            <h2 className="text-2xl font-bold mb-4">DM Campaigns Coming Soon</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              We're working on powerful direct message campaign tools to help you engage with your
              audience more effectively. This feature will include automated outreach, personalized
              messaging, and detailed campaign analytics.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Audience Targeting</h3>
                  <p className="text-sm text-muted-foreground">
                    Target specific user segments based on interests, followers, and engagement
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <MessageSquare className="h-8 w-8 text-green-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Automated Messaging</h3>
                  <p className="text-sm text-muted-foreground">
                    Set up automated message sequences with personalization and smart timing
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Campaign Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Track response rates, engagement metrics, and campaign performance
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" asChild>
                <a href="mailto:support@blueskybot.com?subject=DM Campaigns Beta">
                  Request Beta Access
                </a>
              </Button>
              <Button variant="cta" asChild>
                <a href="/contact-us">Get Notified</a>
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
}

export default DMCampaigns
