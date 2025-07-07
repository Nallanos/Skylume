import { Head } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Heart, Users, Zap, Target } from 'lucide-react'

function Philosophy() {
  return (
    <>
      <Head title="Our Philosophy" />
      <Layout user={null}>
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Our Philosophy
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Building tools that empower creators while respecting the decentralized nature of
                social media
              </p>
            </div>

            {/* Core Values */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-2 border-blue-100 dark:border-blue-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    Decentralization First
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We believe in the power of decentralized social networks. Our tools enhance your
                    Bluesky experience without compromising the platform's core values of user
                    ownership and data portability.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-100 dark:border-purple-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                      <Heart className="h-6 w-6 text-purple-600" />
                    </div>
                    Creator Empowerment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Every creator deserves powerful tools to grow their audience and manage their
                    content. We provide professional-grade features accessible to creators of all
                    sizes.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-100 dark:border-green-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                      <Zap className="h-6 w-6 text-green-600" />
                    </div>
                    Simplicity & Power
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Complex analytics made simple. Powerful automation that just works. We strip
                    away complexity while delivering the functionality you need.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-100 dark:border-orange-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                      <Target className="h-6 w-6 text-orange-600" />
                    </div>
                    Ethical Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Growth should be authentic and respectful. Our tools promote genuine engagement
                    and meaningful connections, not spam or manipulation.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Our Story */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-none">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Our Story</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Born from a frustration with traditional social media platforms, we saw Bluesky as
                  an opportunity to build something different. A place where creators could truly
                  own their audience and data.
                </p>
                <p>
                  Our team of developers, designers, and social media experts came together with one
                  goal: create tools that enhance the Bluesky experience without compromising its
                  decentralized nature.
                </p>
                <p>
                  We're not just building software—we're supporting a movement toward a more open,
                  creator-friendly internet.
                </p>
              </CardContent>
            </Card>

            {/* Our Commitment */}
            <div className="text-center space-y-6">
              <h2 className="text-3xl font-bold text-foreground">Our Commitment</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-blue-600">🔒</div>
                  <h3 className="font-semibold">Privacy First</h3>
                  <p className="text-sm text-muted-foreground">
                    Your data stays yours. We only access what's necessary to provide our services.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-purple-600">🚀</div>
                  <h3 className="font-semibold">Continuous Innovation</h3>
                  <p className="text-sm text-muted-foreground">
                    We're constantly improving and adding features based on your feedback.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-600">🌱</div>
                  <h3 className="font-semibold">Sustainable Growth</h3>
                  <p className="text-sm text-muted-foreground">
                    We grow by helping you grow, creating a virtuous cycle of success.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
}

export default Philosophy
