import { Head } from '@inertiajs/react'
import { Check, X, Sun, Moon, ArrowRight, Star, Zap, Crown } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  plan: string
}

interface Props {
  user?: User
}

// Components
const Navigation = ({ darkMode, toggleTheme }: { darkMode: boolean; toggleTheme: () => void }) => (
  <nav className="w-full bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
    <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
      {/* Logo */}
      <div className="flex items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">BC</span>
          </div>
          <a href="/" className="font-bold text-xl text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            BluePilot
          </a>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="hidden md:flex items-center space-x-6">
        <a href="/pricing" className="text-blue-600 dark:text-blue-400 font-medium border-b-2 border-blue-600 dark:border-blue-400 pb-1">
          Pricing
        </a>
        <a
          href="/dashboard"
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
        >
          Sign Up
        </a>
        
        {/* Toggle Theme Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle theme"
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>
    </div>
  </nav>
)

// Custom hook for theme management
const useTheme = () => {
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('darkMode')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = savedTheme ? savedTheme === 'true' : systemDark

    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())

    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return { darkMode, mounted, toggleTheme }
}

function Pricing({ user }: Props) {
  const { darkMode, mounted, toggleTheme } = useTheme()

  // Avoid flash before hydration
  if (!mounted) {
    return null
  }

  const handleUpgrade = (planKey: string) => {
    // For free plan, redirect to dashboard
    if (planKey === 'free') {
      window.location.href = '/dashboard'
      return
    }
    
    // For paid plans, redirect directly to Stripe checkout
    if (planKey === 'pro' || planKey === 'business') {
      window.location.href = `/stripe/checkout/${planKey}`
      return
    }
    
    // Fallback for other cases
    window.location.href = '/dashboard'
  }

  const plans = [
    {
      name: 'Freemium',
      key: 'free',
      price: 0,
      period: 'Free',
      description: 'Perfect to discover Bluesky',
      icon: Star,
      iconColor: 'text-gray-500',
      cardBorder: 'border-gray-200 dark:border-gray-700',
      features: [
        { name: '7 simultaneous scheduled posts', included: true },
        { name: '2 Bluesky accounts maximum', included: true },
        { name: 'Basic analytics', included: true },
        { name: '2 custom feeds', included: true },
        { name: '5 follower analyses/month', included: true },
        { name: '200 follow actions/day', included: true },
        { name: 'DM Campaigns', included: false },
        { name: 'Advanced analytics', included: false }
      ],
      buttonText: user?.plan === 'free' ? 'Current plan' : 'Start for free',
      buttonVariant: 'outline' as const,
      popular: false
    },
    {
      name: 'Pro',
      key: 'pro',
      price: 10,
      period: '/month',
      description: 'For serious creators',
      icon: Zap,
      iconColor: 'text-blue-500',
      cardBorder: 'border-blue-500 shadow-lg scale-105',
      features: [
        { name: 'Unlimited scheduled posts', included: true },
        { name: 'Unlimited Bluesky accounts', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'Unlimited feeds', included: true },
        { name: 'Unlimited follower analyses', included: true },
        { name: 'Unlimited follow actions', included: true },
        { name: 'DM Campaigns (analysis)', included: true },
        { name: 'DM campaigns execution', included: false }
      ],
      buttonText: user?.plan === 'pro' ? 'Current plan' : 'Upgrade to Pro',
      buttonVariant: 'default' as const,
      popular: true
    },
    {
      name: 'Business',
      key: 'business',
      price: 19,
      period: '/month',
      description: 'For businesses and agencies',
      icon: Crown,
      iconColor: 'text-purple-500',
      cardBorder: 'border-purple-500',
      features: [
        { name: 'Unlimited scheduled posts', included: true },
        { name: 'Unlimited Bluesky accounts', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'Unlimited feeds', included: true },
        { name: 'Unlimited follower analyses', included: true },
        { name: 'Unlimited follow actions', included: true },
        { name: 'DM Campaigns (analysis)', included: true },
        { name: 'DM campaigns execution', included: true }
      ],
      buttonText: user?.plan === 'business' ? 'Current plan' : 'Upgrade to Business',
      buttonVariant: 'default' as const,
      popular: false
    }
  ]

  return (
    <>
      <Head title="Pricing - Bluesky Copilot">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('darkMode');
                  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const isDark = savedTheme ? savedTheme === 'true' : systemDark;
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </Head>
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
        <Navigation darkMode={darkMode} toggleTheme={toggleTheme} />
        
        <div className="container mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-gray-900 dark:text-white">
              Choose your{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                plan
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
              Powerful tools to automate and grow your presence on Bluesky
            </p>
            
            {user && (
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                Current plan: <strong className="ml-1 capitalize">{user.plan}</strong>
              </div>
            )}
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const Icon = plan.icon
              const isCurrentPlan = user?.plan === plan.key
              
              return (
                <Card 
                  key={plan.key} 
                  className={`relative transition-all duration-300 hover:shadow-xl ${plan.cardBorder} bg-white dark:bg-gray-800/50`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
                        Most popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-8">
                    <div className="flex justify-center mb-4">
                      <div className={`p-3 rounded-full bg-gray-100 dark:bg-gray-800`}>
                        <Icon className={`h-8 w-8 ${plan.iconColor}`} />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}€</span>
                        <span className="text-gray-600 dark:text-gray-400">{plan.period}</span>
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">{plan.description}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Features */}
                    <div className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          {feature.included ? (
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${feature.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                            {feature.name}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* CTA Button */}
                    <div className="pt-6">
                      <Button 
                        variant={plan.buttonVariant} 
                        className={`w-full ${
                          plan.popular 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : plan.key === 'business'
                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                            : ''
                        }`}
                        size="lg"
                        disabled={isCurrentPlan}
                        onClick={() => handleUpgrade(plan.key)}
                      >
                        {plan.buttonText}
                        {!isCurrentPlan && plan.key !== 'free' && (
                          <ArrowRight className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {isCurrentPlan && (
                      <div className="text-center">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          ✓ Your current plan
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Comparison Table */}
          <div className="mt-20 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
              Detailed feature comparison
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-center p-4 font-semibold">Freemium</th>
                    <th className="text-center p-4 font-semibold">Pro</th>
                    <th className="text-center p-4 font-semibold">Business</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200 dark:border-gray-600">
                    <td className="p-4">Scheduled posts</td>
                    <td className="text-center p-4">7 simultaneous</td>
                    <td className="text-center p-4">Unlimited</td>
                    <td className="text-center p-4">Unlimited</td>
                  </tr>
                  <tr className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                    <td className="p-4">Bluesky accounts</td>
                    <td className="text-center p-4">2 max</td>
                    <td className="text-center p-4">Unlimited</td>
                    <td className="text-center p-4">Unlimited</td>
                  </tr>
                  <tr className="border-t border-gray-200 dark:border-gray-600">
                    <td className="p-4">Follower analyses</td>
                    <td className="text-center p-4">5/month</td>
                    <td className="text-center p-4">Unlimited</td>
                    <td className="text-center p-4">Unlimited</td>
                  </tr>
                  <tr className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                    <td className="p-4">Follow/unfollow actions</td>
                    <td className="text-center p-4">200/day</td>
                    <td className="text-center p-4">Unlimited</td>
                    <td className="text-center p-4">Unlimited</td>
                  </tr>
                  <tr className="border-t border-gray-200 dark:border-gray-600">
                    <td className="p-4">DM Campaigns</td>
                    <td className="text-center p-4"><X className="h-4 w-4 text-red-500 mx-auto" /></td>
                    <td className="text-center p-4">Analysis only</td>
                    <td className="text-center p-4">Full execution</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">Frequently asked questions</h2>
            <div className="space-y-6">
              <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Can I change my plan anytime?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Yes, you can upgrade or downgrade your plan at any time. Changes are effective immediately and billed pro-rata.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">What happens if I exceed my limits?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    You'll receive a notification inviting you to upgrade your plan. Your existing data won't be deleted, but you won't be able to create new content until you upgrade, or wait for 1 month to reset your limits.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Are there hidden fees?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    No, our prices are transparent. No setup, configuration, or cancellation fees. You only pay your monthly subscription.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center mt-16">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Ready to get started?</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Join thousands of users growing their audience on Bluesky
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
              >
                Start for free
              </Button>
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleUpgrade('pro')}
              >
                Try Pro - $10/month
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              No credit card required for free trial
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Pricing
