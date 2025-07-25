import { Head } from '@inertiajs/react'
import { Button } from '../components/ui/button'
import {
  BarChart,
  CheckCircle,
  ArrowRight,
  UserCheck,
  Sun,
  Moon,
  Brain,
  Target,
  Zap,
  MessageCircle,
} from 'lucide-react'
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
          <span className="font-bold text-xl text-gray-900 dark:text-white">BlueSky Copilot</span>
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
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          href="/dashboard"
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
)

const HeroSection = () => (
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
        <Button variant="cta" size="cta" onClick={() => (window.location.href = '/dashboard')}>
          Try it for free
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
      <div className="text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No credit card required - Get instant access
        </p>
      </div>
    </div>
  </section>
)

const ProblemSolutionSection = () => (
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
            Your posts get ignored, your follower count stagnates, and worst of all, you're losing
            money.
          </p>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Whether you're a brand or a creator, an inactive audience means wasted effort and missed
            opportunities.
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
            Automate interactions, target the right people, and turn your followers into active
            supporters.
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            More engagement, more visibility, more revenue—without the manual grind.
          </p>
        </div>
      </div>
    </div>
  </section>
)

// Section Build - Outils d'analyse et de suivi
const BuildSection = () => (
  <section id="build" className="py-16 bg-gray-100 dark:bg-gray-900">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">
          Build: Analyze & Understand
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Get a clear vision of your performance and audience with precise analytics tools.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <BarChart className="h-8 w-8 text-blue-500 mr-3" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Detailed Analytics</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Track your performance metrics with follower history, top post analysis, and deep
            audience engagement insights.
          </p>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Full follower history
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Top post analysis
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Detailed engagement metrics
            </li>
          </ul>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <UserCheck className="h-8 w-8 text-green-500 mr-3" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              Relationship Tracker
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Manage your relationships with mutual connection tracking, automatic unfollower
            detection, and batch follow/unfollow operations.
          </p>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Unfollower detection
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Mutual connections
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Automated batch operations
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
)

// Section Monetize - Outils de clustering et campagnes
const MonetizeSection = () => (
  <section id="monetize" className="py-16 bg-white dark:bg-gray-800">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">
          Monetize: Target & Convert
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Turn your data into opportunities with our AI clustering and targeted campaign tools.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 shadow-lg border border-purple-200 dark:border-purple-700">
          <div className="flex items-center mb-4">
            <Brain className="h-8 w-8 text-purple-500 mr-3" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              AI Clustering Pipeline
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Our UMAP algorithm analyzes your followers and automatically segments them into coherent
            groups based on interests and behaviors.
          </p>
          <div className="mb-6">
            <div className="text-center">
              <Button
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
                onClick={() => (window.location.href = '/register')}
              >
                <Target className="h-5 w-5 mr-2" />
                Start AI Analysis
              </Button>
            </div>
            <div className="text-center mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Automatic segmentation into 5-10 audience groups
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-6 shadow-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center mb-4">
            <MessageCircle className="h-8 w-8 text-blue-500 mr-3" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              Targeted DM Campaigns
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Create personalized direct message campaigns for each audience segment identified by our
            AI.
          </p>
          <div className="mb-6">
            <div className="text-center">
              <Button
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
                onClick={() => (window.location.href = '/register')}
              >
                <Zap className="h-5 w-5 mr-2" />
                Create a Campaign
              </Button>
            </div>
            <div className="text-center mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Personalized messages for each audience segment
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
)

const VideoSection = () => (
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
            See how our AI-powered platform helps you automate engagement and grow your audience
            effortlessly. This quick demo shows:
          </p>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-300">
                Deep audience analysis with AI-powered clustering
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-300">
                Follower tracking and effortless post scheduling
              </span>
            </li>
          </ul>
          <div className="flex flex-col md:flex-row justify-center gap-4 mb-4">
            <Button variant="cta" size="cta" onClick={() => (window.location.href = '/dashboard')}>
              Try it for free
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No credit card required - Get instant access
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
)

const TestimonialCard = ({
  avatar,
  handle,
  title,
  quote,
  link,
}: {
  avatar: string
  handle: string
  title: string
  quote: string
  link?: string
}) => (
  <div className="p-6 bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
            <img className="rounded-full" src={avatar} alt={handle} />
          </div>
        </div>
        <div>
          {link ? (
            <a
              href={link}
              className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 underline transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {handle}
            </a>
          ) : (
            <p className="text-blue-500 dark:text-blue-400">{handle}</p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        </div>
      </div>
      <blockquote className="text-lg italic text-gray-700 dark:text-gray-300">"{quote}"</blockquote>
    </div>
  </div>
)

const TestimonialsSection = () => (
  <section className="py-16 bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
        They also loved it...
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <TestimonialCard
          avatar="/images/bafkreihdgxviv4vxx7dv4zfwhjylkmbharti2s7jhlndmu4nswpwhk677e.jpg"
          handle="@alexisbouchez.com"
          title="Founder"
          quote="Making use of BlueskyBot is a great way to grow and engage with your audience on Bluesky."
          link="https://bsky.app/profile/alexisbouchez.com"
        />
        <TestimonialCard
          avatar="/images/pdpDemon.jpg"
          handle="@dem...ny.bsky.social"
          title="Content creator"
          quote="I started using the Bluesky bot to help grow my platform, and honestly, it's been a game changer."
        />
        <TestimonialCard
          avatar="/images/nallanos.jpg"
          handle="@nallanos.bsky.social"
          title="Founder"
          quote="I use the tool myself on a daily basis, and each update is designed to make the experience even smoother."
          link="https://bsky.app/profile/nallanos.bsky.social"
        />
      </div>
    </div>
  </section>
)

const Footer = () => (
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
            <h3 className="text-lg font-bold text-blue-500 dark:text-blue-400 mb-4">Quick Links</h3>
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

function Home() {
  const { darkMode, mounted, toggleTheme } = useTheme()

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
        <Navigation darkMode={darkMode} toggleTheme={toggleTheme} />
        <HeroSection />
        <ProblemSolutionSection />
        <BuildSection />
        <MonetizeSection />
        <VideoSection />
        <TestimonialsSection />
        <Footer />
      </div>
    </>
  )
}

export default Home
