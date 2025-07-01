import { Head, usePage } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Sparkles, Brain, TrendingUp, Target, Zap, Lock } from 'lucide-react'

interface User {
  id: number
  email: string
  plan?: string
}

function AiAnalysis() {
  const { props } = usePage()
  const user = props.user as User

  const aiFeatures = [
    {
      icon: Brain,
      title: 'Content Optimization',
      description: 'AI-powered suggestions to improve your post engagement and reach.',
      status: 'Coming Soon',
    },
    {
      icon: Target,
      title: 'Audience Insights',
      description: 'Deep learning analysis of your follower behavior and preferences.',
      status: 'Beta',
    },
    {
      icon: Sparkles,
      title: 'Smart Scheduling',
      description: 'Optimal posting times based on your audience activity patterns.',
      status: 'Coming Soon',
    },
    {
      icon: TrendingUp,
      title: 'Trend Prediction',
      description: 'Identify trending topics and hashtags before they peak.',
      status: 'Planned',
    },
  ]

  return (
    <>
      <Head title="AI Analysis" />
      <Layout user={user}>
        <div className="p-6 max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                AI Analysis
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Harness the power of artificial intelligence to supercharge your Bluesky presence
            </p>
          </div>

          {/* Pro Feature Notice */}
          {user?.plan !== 'pro' && (
            <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                    <Lock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                      Pro Feature - Advanced AI Analysis
                    </h3>
                    <p className="text-purple-700 dark:text-purple-300 mt-1">
                      Unlock cutting-edge AI features to optimize your content and grow your
                      audience intelligently.
                    </p>
                  </div>
                  <Button
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    asChild
                  >
                    <a href="/plan/change">Upgrade to Pro</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aiFeatures.map((feature, index) => {
              const IconComponent = feature.icon
              const isAvailable = feature.status === 'Beta' && user?.plan === 'pro'

              return (
                <Card
                  key={index}
                  className={`transition-all duration-200 ${isAvailable ? 'hover:shadow-lg cursor-pointer' : 'opacity-75'}`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${isAvailable ? 'bg-purple-100 dark:bg-purple-900/50' : 'bg-gray-100 dark:bg-gray-800'}`}
                        >
                          <IconComponent
                            className={`h-5 w-5 ${isAvailable ? 'text-purple-600' : 'text-gray-500'}`}
                          />
                        </div>
                        {feature.title}
                      </div>
                      <Badge
                        variant={feature.status === 'Beta' ? 'default' : 'secondary'}
                        className={feature.status === 'Beta' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {feature.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                    {isAvailable && (
                      <Button className="mt-4 w-full" variant="outline">
                        Try Now
                      </Button>
                    )}
                    {feature.status !== 'Beta' && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          This feature is currently under development. Stay tuned for updates!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                How AI Analysis Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-xl font-bold text-blue-600">1</span>
                  </div>
                  <h3 className="font-semibold">Data Collection</h3>
                  <p className="text-sm text-muted-foreground">
                    We analyze your posts, engagement patterns, and audience behavior.
                  </p>
                </div>

                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-xl font-bold text-purple-600">2</span>
                  </div>
                  <h3 className="font-semibold">AI Processing</h3>
                  <p className="text-sm text-muted-foreground">
                    Advanced machine learning algorithms identify patterns and opportunities.
                  </p>
                </div>

                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-xl font-bold text-green-600">3</span>
                  </div>
                  <h3 className="font-semibold">Actionable Insights</h3>
                  <p className="text-sm text-muted-foreground">
                    Receive personalized recommendations to optimize your content strategy.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Notice */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Lock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Privacy-First AI
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Your data privacy is our top priority. All AI analysis is performed with strict
                    privacy controls, and your personal data is never shared with third parties. Our
                    AI models are designed to provide insights while keeping your information secure
                    and anonymous.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  )
}

export default AiAnalysis
