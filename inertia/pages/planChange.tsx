import { Head } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Check, Sparkles, Star, Zap } from 'lucide-react'

interface PlanChangeProps {
  user: any
}

function PlanChange({ user }: PlanChangeProps) {
  const currentPlan = user?.plan || 'free'

  return (
    <>
      <Head title="Upgrade Plan" />
      <Layout user={user}>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Choose Your Plan</h1>
            <p className="text-muted-foreground">
              Unlock powerful features to grow your Bluesky presence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <Card className={`relative ${currentPlan === 'free' ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-gray-500" />
                    Free Plan
                  </CardTitle>
                  {currentPlan === 'free' && <Badge variant="secondary">Current</Badge>}
                </div>
                <div className="text-3xl font-bold">
                  $0<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground">Perfect for getting started</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Up to 3 connected accounts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Basic scheduling</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Simple analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Community support</span>
                  </li>
                </ul>

                {currentPlan === 'free' ? (
                  <Button disabled className="w-full">
                    Current Plan
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full">
                    Downgrade to Free
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card
              className={`relative ${currentPlan === 'pro' ? 'ring-2 ring-blue-500' : 'ring-2 ring-gradient-to-r from-purple-500 to-blue-500'}`}
            >
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-500" />
                    Pro Plan
                  </CardTitle>
                  {currentPlan === 'pro' && <Badge variant="secondary">Current</Badge>}
                </div>
                <div className="text-3xl font-bold">
                  $29<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground">For serious content creators</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Unlimited connected accounts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Advanced scheduling & automation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">AI-powered content suggestions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Detailed analytics & insights</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Audience analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">DM campaigns</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Priority support</span>
                  </li>
                </ul>

                {currentPlan === 'pro' ? (
                  <Button disabled className="w-full">
                    Current Plan
                  </Button>
                ) : (
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                    Upgrade to Pro
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="mt-12 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h2>
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Can I change my plan anytime?</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect
                    immediately, and you'll be billed prorated for upgrades.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold">What happens to my data if I downgrade?</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Your data remains safe. However, you'll lose access to Pro features and may need
                    to disconnect excess accounts if you exceed the Free plan limits.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Is there a refund policy?</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We offer a 7-day money-back guarantee for new Pro subscriptions. Contact support
                    if you're not satisfied with your upgrade.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
}

export default PlanChange
