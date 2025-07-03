import { Head } from '@inertiajs/react'
import { Button } from '../components/ui/button'
import { ArrowRight, CheckCircle, BarChart, Zap, MessageSquare, Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'

function Home() {
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

  // Éviter le flash avant hydratation
  if (!mounted) {
    return null
  }

  return (
    <>
      <Head title="BlueSky Copilot - Social Media Management">
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
        {/* Navigation inspirée de Samee */}
        <nav className="w-full bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
          <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">BC</span>
                </div>
                <span className="font-bold text-xl text-gray-900 dark:text-white">
                  BlueSky Copilot
                </span>
              </div>
            </div>

            {/* Navigation centrale */}
            <div className="hidden md:flex items-center space-x-8">
              <div className="relative group">
                <a
                  href="/product"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium flex items-center transition-colors"
                >
                  Product
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </a>
              </div>
              <a
                href="/pricing"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
              >
                Pricing
              </a>
              <a
                href="/about"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
              >
                About
              </a>
              <a
                href="/help"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
              >
                Help
              </a>
            </div>

            {/* Boutons droite */}
            <div className="flex items-center space-x-4">
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
              <a
                href="/login"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
              >
                Log In
              </a>
              <a
                href="/register"
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
              >
                Sign Up
              </a>
            </div>
          </div>
        </nav>

        {/* Hero Section avec fond animé */}
        <section className="relative flex flex-col justify-center items-center text-center px-4 pt-16 pb-20 overflow-hidden w-full bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300">
          {/* Fond animé similaire au Svelte */}
          <div className="absolute inset-0 w-full opacity-10 dark:opacity-20">
            <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
            <div
              className="absolute bottom-32 right-10 w-72 h-72 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"
              style={{ animationDelay: '2s' }}
            ></div>
          </div>

          <div className="max-w-4xl mb-8 relative z-10">
            <div className="mb-6 flex justify-center items-center gap-2">
              <div className="bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                🚀 Alpha Exclusive - Shape the Future
              </div>
            </div>
            <h1 className="text-4xl md:text-7xl font-bold mb-6 leading-tight text-gray-900 dark:text-white">
              Start building and{' '}
              <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                monetizing
              </span>{' '}
              your bluesky audience
            </h1>
            <p className="text-lg md:text-2xl text-gray-600 dark:text-gray-300 mb-8">
              Automate audience growth and monetization
            </p>

            <div className="flex flex-col md:flex-row justify-center gap-4 mb-4">
              <Button
                variant="cta"
                size="cta"
                onClick={() => (window.location.href = '/dashboard')}
              >
                Try it for free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No credit card required - Get instant access
            </p>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                Unlock Your Bluesky Potential
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Stop wasting time and money on a dead audience.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 bg-white dark:bg-gray-900/50 rounded-xl border border-blue-200 dark:border-blue-900 shadow-sm">
                <div className="text-blue-500 dark:text-blue-400 text-sm mb-2 font-semibold">
                  The Problem
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                  Your Audience is Silent
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Your posts get ignored, your follower count stagnates, and worst of all, you're
                  losing money.
                </p>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Whether you're a brand or a creator, an inactive audience means wasted effort and
                  missed opportunities.
                </p>
              </div>
              <div className="p-8 bg-white dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                <div className="text-blue-500 dark:text-blue-400 text-sm mb-2 font-semibold">
                  Our Solution
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                  AI-Driven Engagement
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Automate interactions, target the right people, and turn your followers into
                  active supporters.
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  More engagement, more visibility, more revenue—without the manual grind.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-white dark:bg-gray-900 transition-colors duration-300">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                Your Bluesky Growth Engine
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-xl">
                Everything you need to convert your audience
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              {/* Feature 1 */}
              <div className="bg-white dark:bg-gray-900/50 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-lg">
                <MessageSquare className="w-12 h-12 text-blue-500 dark:text-blue-400 mb-6" />
                <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                  Automated Personalized DMs
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Convert new followers into leads with{' '}
                  <span className="text-blue-500 dark:text-blue-400">
                    AI-powered personalized messages
                  </span>
                </p>
                <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span>Customizable templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span>Smart delay between messages</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span>Conversion tracking</span>
                  </li>
                </ul>
              </div>

              {/* Feature 2 */}
              <div className="bg-white dark:bg-gray-900/50 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-lg">
                <Zap className="w-12 h-12 text-blue-500 dark:text-blue-400 mb-6" />
                <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                  AI Content Generation
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create engaging posts with{' '}
                  <span className="text-blue-500 dark:text-blue-400">
                    AI trained on viral content patterns
                  </span>
                </p>
                <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span>Content scheduling</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span>Performance analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span>Hashtag suggestions</span>
                  </li>
                </ul>
              </div>

              {/* Feature 3 */}
              <div className="bg-white dark:bg-gray-900/50 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-lg">
                <BarChart className="w-12 h-12 text-blue-500 dark:text-blue-400 mb-6" />
                <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                  Advanced Analytics
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Track your performance with{' '}
                  <span className="text-blue-500 dark:text-blue-400">real-time dashboards</span>
                </p>
                <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span>Campaign ROI tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span>Best time to post analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span>Custom alerts</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Button */}
        <div className="flex flex-col md:flex-row justify-center gap-4 mb-4">
              <Button
                variant="cta"
                size="cta"
                onClick={() => (window.location.href = '/dashboard')}
              >
                Try it for free
                <ArrowRight className="w-5 h-5" />
              </Button>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No credit card required - Get instant access
        </p>

        {/* Video Demo Section */}
        <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Video Container */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
                <video
                  className="w-full aspect-video object-cover opacity-90"
                  src="/videos/FINAL.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Text Content */}
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold leading-tight text-gray-900 dark:text-white">
                  Transform Your Bluesky Strategy{' '}
                  <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
                    in 90 Seconds
                  </span>
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  See how our AI-powered platform helps you automate engagement and grow your
                  audience effortlessly. This quick demo shows:
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-300">
                      How to set up bots in 3 clicks
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-300">
                      Effortless message scheduling
                    </span>
                  </li>
                </ul>
                <div className="flex flex-col md:flex-row justify-center gap-4 mb-4">
              <Button
                variant="cta"
                size="cta"
                onClick={() => (window.location.href = '/dashboard')}
              >
                Try it for free
                <ArrowRight className="w-5 h-5" />
              </Button>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No credit card required - Get instant access
        </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              They also loved it...
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <div className="p-6 bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <img
                          className="rounded-full"
                          src="/images/bafkreihdgxviv4vxx7dv4zfwhjylkmbharti2s7jhlndmu4nswpwhk677e.jpg"
                          alt="Alexis Bouchez"
                        />
                      </div>
                    </div>
                    <div>
                      <a
                        href="https://bsky.app/profile/alexisbouchez.com"
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 underline transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        @alexisbouchez.com
                      </a>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Founder</p>
                    </div>
                  </div>
                  <blockquote className="text-lg italic text-gray-700 dark:text-gray-300">
                    "Making use of BlueskyBot is a great way to grow and engage with your audience
                    on Bluesky."
                  </blockquote>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="p-6 bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <img src="/images/pdpDemon.jpg" alt="" className="rounded-full" />
                      </div>
                    </div>
                    <div>
                      <p className="text-blue-500 dark:text-blue-400">@dem...ny.bsky.social</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Content creator</p>
                    </div>
                  </div>
                  <blockquote className="text-lg italic text-gray-700 dark:text-gray-300">
                    "I started using the Bluesky bot to help grow my platform, and honestly, it's
                    been a game changer."
                  </blockquote>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="p-6 bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <img className="rounded-full" src="/images/nallanos.jpg" alt="Nallanos" />
                      </div>
                    </div>
                    <div>
                      <a
                        href="https://bsky.app/profile/nallanos.bsky.social"
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 underline transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        @nallanos.bsky.social
                      </a>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Founder</p>
                    </div>
                  </div>
                  <blockquote className="text-lg italic text-gray-700 dark:text-gray-300">
                    "I use the tool myself on a daily basis, and each update is designed to make the
                    experience even smoother."
                  </blockquote>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Alpha Benefits */}
        <section className="py-16 flex flex-col w-full bg-white dark:bg-gray-900 transition-colors duration-300">
          <div className="mx-auto px-4 w-full flex flex-col">
            <div className="text-center mb-12">
              <h3 className="text-sm uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-4">
                Alpha Perks
              </h3>
              <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
                Help Build the Ultimate Bluesky Tool
              </h2>
            </div>
            <div className="gap-8 flex justify-center">
              <div className="bg-blue-50 dark:bg-gray-800/20 w-1/3 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="text-lg font-bold text-blue-500 dark:text-blue-400 mb-2">
                  🚀 Early Access
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  Test new features before anyone else
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-gray-800/20 p-6 w-1/3 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="text-lg font-bold text-blue-500 dark:text-blue-400 mb-2">
                  💡 Direct Influence
                </div>
                <p className="text-gray-600 dark:text-gray-300">Shape the product roadmap</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-20 bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300">
          <div className="max-w-4xl mx-auto text-center px-4">
            <div className="mb-6 text-sm text-blue-500 dark:text-blue-400 font-bold">
              ALPHA ACCESS OPEN
            </div>
            <h2 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">
              Ready to Pioneer the Future of
              <br />
              <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
                Bluesky Automation?
              </span>
            </h2>
            <div className="mb-8">
              <Button 
                variant="cta" 
                size="cta"
                onClick={() => (window.location.href = '/dashboard')}
              >
                Try it for free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No obligations • Cancel anytime • Privacy-first
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-800 pt-12 mt-16 bg-white dark:bg-gray-900 transition-colors duration-300">
          <div className="container mx-auto px-4">
            <div className="py-8 flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="text-center md:text-left mb-8 md:mb-0">
                <div className="mb-3">
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
                    Bluesky Tools
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  © 2024 Made with ❤️ par{' '}
                  <a
                    href="https://x.com/Nallan0s"
                    className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  >
                    @Nallan0s
                  </a>
                </p>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl">
                <div>
                  <h3 className="text-lg font-bold text-blue-500 dark:text-blue-400 mb-4">
                    Quick Links
                  </h3>
                  <ul className="space-y-3">
                    <li>
                      <a
                        href="/terms"
                        className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      >
                        Terms
                      </a>
                    </li>
                    <li>
                      <a
                        href="/privacy"
                        className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      >
                        Privacy
                      </a>
                    </li>
                    <li>
                      <a
                        href="/pricing"
                        className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      >
                        Pricing
                      </a>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-blue-500 dark:text-blue-400 mb-4">FAQ</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-blue-500 dark:text-blue-400 font-semibold mb-2">
                        Is it really free?
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Yes! During the alpha phase, all features are available at no cost.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-blue-500 dark:text-blue-400 font-semibold mb-2">
                        How long does it take to set up?
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Setting up typically takes less than five minutes for most users.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

export default Home
