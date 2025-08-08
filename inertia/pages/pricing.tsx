import { Head } from '@inertiajs/react'
import { Check, X } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

function Pricing() {
  const plans = [
    {
      name: 'Free Forever',
      price: '0',
      period: 'forever',
      description: 'Everything you need, completely free',
      features: [
        'Unlimited Bluesky accounts',
        'Unlimited scheduled posts',
        'Advanced analytics',
        'Audience insights',
        'Bulk scheduling',
        'All premium features',
      ],
      limitations: [],
      buttonText: 'Get Started',
      buttonVariant: 'default' as const,
      popular: true,
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
              Completely Free
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Access all features without any cost. No hidden fees, no premium tiers, just free access to everything.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="flex justify-center max-w-md mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className="relative transition-all duration-300 hover:shadow-xl border-blue-500 shadow-lg w-full"
              >
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Free
                  </span>
                </div>

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
                  <h3 className="font-semibold mb-2">Is everything really free?</h3>
                  <p className="text-muted-foreground">
                    Yes! All features are completely free forever. No hidden costs, no premium tiers, no trial periods.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Do I need a credit card?</h3>
                  <p className="text-muted-foreground">
                    No credit card required. Simply sign up and start using all features immediately.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">How do you make money then?</h3>
                  <p className="text-muted-foreground">
                    We're currently in alpha and focused on building the best product. We believe in providing value first.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center mt-16">
            <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-6">
              Join creators who are already using our free platform
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg">Get Started Free</Button>
              <Button variant="outline" size="lg" asChild>
                <a href="/dashboard">Try Now</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Pricing
