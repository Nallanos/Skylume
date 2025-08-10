import { Head } from '@inertiajs/react'
import { Check, X, Sun, Moon, ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useState, useEffect } from 'react'

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

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Boutons droite */}
      <div className="flex items-center space-x-4">
        <a
          href="/pricing"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors border-b-2 border-blue-600 dark:border-blue-400 pb-1"
        >
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

// Hook personnalisé pour la gestion du thème
const useTheme = () => {
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Vérifier d'abord localStorage, sinon utiliser la préférence système
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

function Pricing() {
  const { darkMode, mounted, toggleTheme } = useTheme()

  // Éviter le flash avant hydratation
  if (!mounted) {
    return null
  }

  const plans = [
    {
      name: 'Alpha Access',
      price: '0',
      period: 'during alpha',
      originalPrice: '10',
      description: 'Free access to all features during alpha testing',
      features: [
        'Unlimited Bluesky accounts',
        'Unlimited scheduled posts',
        'Advanced analytics',
        'Audience insights',
        'Bulk scheduling',
        'AI audience analysis',
        'DM campaigns',
        'Priority support',
        'All future features',
      ],
      limitations: [],
      buttonText: 'Get Alpha Access',
      buttonVariant: 'default' as const,
      popular: true,
    },
  ]

  return (
    <>
      <Head title="Pricing - BluePilot">
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
              Free During{' '}
              <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Alpha Phase
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-4">
              Get unlimited access to all features completely free during our alpha testing phase.
            </p>
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              🚀 Alpha Price: <span className="font-bold">$0</span> → Post-Alpha: <span className="font-bold">$10/month</span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="flex justify-center max-w-md mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className="relative transition-all duration-300 hover:shadow-xl border-blue-500 shadow-lg w-full bg-white dark:bg-gray-800/50"
              >
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Alpha Access
                  </span>
                </div>

                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                      <span className="text-gray-600 dark:text-gray-400">/{plan.period}</span>
                    </div>
                    {plan.originalPrice && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Regular price: <span className="line-through">${plan.originalPrice}/month</span>
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Limitations */}
                  {plan.limitations.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      {plan.limitations.map((limitation, limitIndex) => (
                        <div key={limitIndex} className="flex items-center gap-3">
                          <X className="h-4 w-4 text-red-400 flex-shrink-0" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">{limitation}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CTA Button */}
                  <div className="pt-6">
                    <Button 
                      variant={plan.buttonVariant} 
                      className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`} 
                      size="lg"
                      onClick={() => window.location.href = '/dashboard'}
                    >
                      {plan.buttonText}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Is it really free during alpha?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Yes! All features are completely free during our alpha testing phase. This helps us gather feedback and improve the platform.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">What happens after the alpha phase?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    After alpha, the platform will be $10/month. Alpha users will get advance notice and special pricing offers.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">How long will the alpha phase last?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    The alpha phase will continue as we refine features and gather user feedback. We'll give at least 30 days notice before transitioning to paid plans.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Do I need a credit card?</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    No credit card required during the alpha phase. Simply sign up and start using all features immediately.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center mt-16">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Ready to get started?</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Join our alpha program and get unlimited access to all features for free
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => window.location.href = '/dashboard'}
              >
                Get Alpha Access Free
              </Button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Free during alpha → $10/month after launch
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Pricing
