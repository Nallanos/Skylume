import { Head } from '@inertiajs/react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  MessageSquare, 
  Zap, 
  Shield, 
  BarChart2,
  ArrowRight,
  Check,
  Star
} from 'lucide-react'

function Home() {
  return (
    <>
      <Head title="BlueSky Copilot - Social Media Management" />
      <div className="min-h-screen bg-white dark:bg-gray-950">
        {/* Navigation */}
        <nav className="border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  BlueSky Copilot
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="ghost" asChild>
                  <a href="/login">Sign In</a>
                </Button>
                <Button asChild className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 text-white dark:text-gray-900">
                  <a href="/register">Get Started</a>
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Master your
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                BlueSky presence
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
              Schedule posts, analyze your audience, and grow your following with our powerful BlueSky management platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 text-white dark:text-gray-900">
                <a href="/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="/pricing">View Pricing</a>
              </Button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Free 14-day trial • No credit card required
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Everything you need to succeed on BlueSky
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Professional tools to grow your social media presence
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                    <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-gray-900 dark:text-gray-100">Smart Scheduling</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Schedule your posts at optimal times when your audience is most active. Never miss the perfect moment to engage.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4">
                    <BarChart2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-gray-900 dark:text-gray-100">Advanced Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Track your performance with detailed analytics. Understand what content resonates with your audience.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-gray-900 dark:text-gray-100">Audience Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Deep dive into your follower demographics and engagement patterns to optimize your content strategy.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                <CardHeader>
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mb-4">
                    <MessageSquare className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle className="text-gray-900 dark:text-gray-100">DM Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Automate your direct message campaigns to engage with your audience and grow your network effectively.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                <CardHeader>
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <CardTitle className="text-gray-900 dark:text-gray-100">AI-Powered Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Leverage AI to get content suggestions, optimal posting times, and audience engagement predictions.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                <CardHeader>
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <CardTitle className="text-gray-900 dark:text-gray-100">Secure & Reliable</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your data is protected with enterprise-grade security. 99.9% uptime guarantee for peace of mind.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-12">
              Choose the plan that's right for you
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                <CardHeader className="text-center">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">Free</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">$0</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">per month</div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {['1 BlueSky account', '5 scheduled posts', 'Basic analytics', 'Email support'].map((feature) => (
                      <div key={feature} className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" variant="outline" asChild>
                    <a href="/register">Get Started</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-500 bg-white dark:bg-gray-950 relative">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                </div>
                <CardHeader className="text-center">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">Pro</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">$19</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">per month</div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {['Unlimited accounts', 'Unlimited posts', 'Advanced analytics', 'DM campaigns', 'AI insights', 'Priority support'].map((feature) => (
                      <div key={feature} className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full bg-blue-500 hover:bg-blue-600" asChild>
                    <a href="/register">Start Free Trial</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Ready to grow your BlueSky presence?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Join thousands of creators and businesses using BlueSky Copilot to maximize their social media impact.
            </p>
            <Button asChild size="lg" className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 text-white dark:text-gray-900">
              <a href="/register">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-800 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  BlueSky Copilot
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The ultimate social media management platform for BlueSky.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Product</h3>
                <ul className="space-y-2">
                  <li><a href="/pricing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Pricing</a></li>
                  <li><a href="/dashboard" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Dashboard</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Company</h3>
                <ul className="space-y-2">
                  <li><a href="/philosophy" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Philosophy</a></li>
                  <li><a href="/contact-us" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Contact</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="/privacy" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Privacy Policy</a></li>
                  <li><a href="/terms" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Terms of Service</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-8 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                © 2025 BlueSky Copilot. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

export default Home
