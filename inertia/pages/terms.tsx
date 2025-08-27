import { Head } from '@inertiajs/react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

function Terms() {
  return (
    <>
      <Head title="Terms of Service" />
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center">Terms of Service</CardTitle>
              <p className="text-center text-muted-foreground">Last updated: December 2024</p>
            </CardHeader>

            <CardContent className="prose prose-gray dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground mb-4">
                  By accessing and using Skynalytic, you accept and agree to be bound by the terms
                  and provision of this agreement. If you do not agree to abide by the above, please
                  do not use this service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">2. Service Description</h2>
                <p className="text-muted-foreground mb-4">
                  Skynalytic provides social media management tools for the Bluesky platform,
                  including post scheduling, analytics, and account management features.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">3. User Responsibilities</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>
                    You are responsible for maintaining the confidentiality of your account
                    credentials
                  </li>
                  <li>You agree not to use the service for any unlawful purpose</li>
                  <li>You will not post content that violates Bluesky's terms of service</li>
                  <li>You will not attempt to interfere with the service's security</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">4. Privacy and Data</h2>
                <p className="text-muted-foreground mb-4">
                  Your privacy is important to us. Please review our Privacy Policy, which also
                  governs your use of the Service, to understand our practices.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">5. Service Availability</h2>
                <p className="text-muted-foreground mb-4">
                  We strive to maintain high service availability, but we do not guarantee
                  uninterrupted service. We may perform maintenance that temporarily affects service
                  availability.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">6. Limitation of Liability</h2>
                <p className="text-muted-foreground mb-4">
                  In no event shall Skynalytic be liable for any indirect, incidental, special,
                  consequential, or punitive damages, including without limitation, loss of profits,
                  data, use, goodwill, or other intangible losses.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">7. Termination</h2>
                <p className="text-muted-foreground mb-4">
                  We may terminate or suspend your account immediately, without prior notice or
                  liability, for any reason whatsoever, including without limitation if you breach
                  the Terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">8. Changes to Terms</h2>
                <p className="text-muted-foreground mb-4">
                  We reserve the right, at our sole discretion, to modify or replace these Terms at
                  any time. If a revision is material, we will try to provide at least 30 days
                  notice prior to any new terms taking effect.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">9. Contact Information</h2>
                <p className="text-muted-foreground mb-4">
                  If you have any questions about these Terms of Service, please contact us at{' '}
                  <a href="mailto:support@blueskybot.com" className="text-blue-600 hover:underline">
                    support@blueskybot.com
                  </a>
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

export default Terms
