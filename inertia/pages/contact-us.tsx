import { Head, useForm } from '@inertiajs/react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Mail, MessageCircle, Clock } from 'lucide-react'

function ContactUs() {
  const { data, setData, post, processing } = useForm({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/contact-us')
  }

  return (
    <>
      <Head title="Contact Us" />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Get in Touch
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have questions about Bluesky Bot? We're here to help. Reach out to our team and we'll
              get back to you as soon as possible.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold">Email Support</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-2">
                    Get help with your account or technical issues
                  </p>
                  <a
                    href="mailto:support@blueskybot.com"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    support@blueskybot.com
                  </a>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <MessageCircle className="h-5 w-5 text-green-500" />
                    <h3 className="font-semibold">Sales Inquiries</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-2">
                    Questions about pricing or enterprise features
                  </p>
                  <a
                    href="mailto:sales@blueskybot.com"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    sales@blueskybot.com
                  </a>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="h-5 w-5 text-purple-500" />
                    <h3 className="font-semibold">Response Time</h3>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Support: Within 24 hours</p>
                    <p>• Sales: Within 4 hours</p>
                    <p>• Urgent: Within 2 hours</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Send us a Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Your full name"
                          value={data.name}
                          onChange={(e) => setData('name', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={data.email}
                          onChange={(e) => setData('email', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        type="text"
                        placeholder="What's this about?"
                        value={data.subject}
                        onChange={(e) => setData('subject', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="message">Message</Label>
                      <textarea
                        id="message"
                        rows={6}
                        className="w-full p-3 border rounded-md resize-none bg-background"
                        placeholder="Tell us more about your question or issue..."
                        value={data.message}
                        onChange={(e) => setData('message', e.target.value)}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={processing}
                      className="w-full md:w-auto"
                      size="lg"
                    >
                      {processing ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-center mb-8">Common Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">How do I connect my Bluesky account?</h3>
                  <p className="text-muted-foreground text-sm">
                    Go to your dashboard and click "Add Account". You'll be redirected to Bluesky
                    for secure OAuth authentication.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Can I schedule posts in advance?</h3>
                  <p className="text-muted-foreground text-sm">
                    Yes! All plans include post scheduling. Free users get 7 scheduled posts per
                    month, while Pro users get unlimited scheduling.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Is my data secure?</h3>
                  <p className="text-muted-foreground text-sm">
                    Absolutely. We use industry-standard encryption and never store your Bluesky
                    password. All connections use secure OAuth tokens.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                  <p className="text-muted-foreground text-sm">
                    Yes, you can cancel your subscription at any time. You'll continue to have
                    access until the end of your billing period.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ContactUs
