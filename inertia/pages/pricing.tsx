import { Head } from '@inertiajs/react'
import { Check, X } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        '1 Bluesky account',
        '5 scheduled posts per month',
        'Basic analytics',
        'Community support',
      ],
      limitations: ['No advanced analytics', 'No bulk scheduling', 'No priority support'],
      buttonText: 'Get Started',
      buttonVariant: 'outline' as const,
      popular: false,
    },
    {
      name: 'Pro',
      price: '9',
      period: 'month',
      description: 'For growing creators and businesses',
      features: [
        '5 Bluesky accounts',
        'Unlimited scheduled posts',
        'Advanced analytics',
        'Audience insights',
        'Bulk scheduling',
        'Priority support',
      ],
      limitations: [],
      buttonText: 'Start Free Trial',
      buttonVariant: 'default' as const,
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '29',
      period: 'month',
      description: 'For teams and agencies',
      features: [
        'Unlimited accounts',
        'Unlimited scheduled posts',
        'Advanced analytics',
        'Team collaboration',
        'White-label options',
        'Custom integrations',
        'Dedicated support',
      ],
      limitations: [],
      buttonText: 'Contact Sales',
      buttonVariant: 'outline' as const,
      popular: false,
    },
  ]

  return (
    <>
      <Head title="Pricing" />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan for your Bluesky management needs. All plans include our core
              features with no hidden fees.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`relative transition-all duration-300 hover:shadow-xl ${
                  plan.popular ? 'border-blue-500 shadow-lg scale-105' : 'hover:scale-105'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  <p className="text-muted-foreground mt-2">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Limitations */}
                  {plan.limitations.length > 0 && (
                    <div className="space-y-3 pt-4 border-t">
                      {plan.limitations.map((limitation, limitIndex) => (
                        <div key={limitIndex} className="flex items-center gap-3">
                          <X className="h-4 w-4 text-red-400 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{limitation}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CTA Button */}
                  <div className="pt-6">
                    <Button variant={plan.buttonVariant} className="w-full" size="lg">
                      {plan.buttonText}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
                  <p className="text-muted-foreground">
                    Yes! You can upgrade or downgrade your plan at any time. Changes take effect
                    immediately and we'll prorate any differences.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Is there a free trial?</h3>
                  <p className="text-muted-foreground">
                    The Pro plan comes with a 14-day free trial. No credit card required to start.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
                  <p className="text-muted-foreground">
                    We accept all major credit cards (Visa, MasterCard, American Express) and PayPal
                    for your convenience.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center mt-16">
            <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of creators who trust us with their Bluesky presence
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg">Start Free Trial</Button>
              <Button variant="outline" size="lg" asChild>
                <a href="/contact-us">Contact Sales</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Pricing
