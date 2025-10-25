import { Head } from '@inertiajs/react'
import { Button } from '../components/ui/button'
import { Sun, Moon, Github, Mail, Heart, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Props {
  businessPlanCounter?: any
}

// Theme hook
const useTheme = () => {
  const [darkMode, setDarkMode] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('darkMode')
    const isDark = savedTheme ? savedTheme === 'true' : true
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
    localStorage.setItem('darkMode', String(newDarkMode))
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return { darkMode, mounted, toggleTheme }
}

const Navigation = ({ darkMode, toggleTheme }: { darkMode: boolean; toggleTheme: () => void }) => (
  <nav className="w-full bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
    <div className="max-w-5xl mx-auto flex justify-between items-center px-6 py-4">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">SK</span>
        </div>
        <span className="font-bold text-xl text-gray-900 dark:text-white">Skylume</span>
      </div>

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
  </nav>
)

function Home({}: Props) {
  const { darkMode, mounted, toggleTheme } = useTheme()

  if (!mounted) {
    return null
  }

  return (
    <>
      <Head title="Skylume - Now Free Forever">
        <meta name="description" content="Skylume is no longer a commercial project. All features are now free forever. A year-long lesson in market validation." />
        <meta name="robots" content="index, follow" />
      </Head>
      
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
        <Navigation darkMode={darkMode} toggleTheme={toggleTheme} />
        
        {/* Main Content */}
        <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
          
          {/* Status Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800">
               Now Free Forever
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-center leading-tight">
            Skylume is no longer a{' '}
            <span className="text-blue-500">commercial project</span>
          </h1>

          {/* Intro */}
          <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 text-center mb-8">
              After spending a year building growth automation tools for Bluesky, I learned something important:
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-800/50 border-l-4 border-blue-500 p-6 rounded-r-lg mb-8">
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-0">
                Bluesky's community came here specifically to <strong>escape</strong> the growth hacking and automation culture of Twitter/X.
              </p>
            </div>

            <p className="text-gray-600 dark:text-gray-400">
              I built follower automation, DM campaigns, audience clustering, scheduling tools all the growth hacking features that work on other platforms. But market validation showed that Bluesky users actively reject these approaches. They value authentic connections and organic growth over automated engagement.
            </p>

            <p className="text-gray-600 dark:text-gray-400">
              That's a feature, not a bug. And I respect it.
            </p>
          </div>

          {/* What Happens Now */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 border border-green-200 dark:border-green-800 rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">What This Means</h2>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span><strong>Everything is free now.</strong> No paywalls, no subscriptions, no credit card required.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span><strong>The product stays online</strong> as long as server costs allow (probably years).</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span><strong>All 33 users</strong> who tried it: thank you. Your feedback was invaluable.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span><strong>Existing subscriptions:</strong> Already cancelled. You won't be charged again.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span><strong>Open source soon:</strong> Code will be on GitHub for anyone who wants to fork/maintain it.</span>
              </li>
            </ul>
          </div>

          {/* Lessons Learned */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">What I Learned</h2>
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  1. Validate the market BEFORE building
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  I should have talked to 50+ potential customers before writing a single line of code. Instead, I built first and validated later expensive mistake.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  2. Don't build automation for anti-automation platforms
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Bluesky users explicitly left Twitter to escape growth hacking. Building growth hacking tools for them was solving a problem they actively didn't want solved.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  3. Platform culture matters more than features
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  The best-executed product won't succeed if it's culturally misaligned with its target platform. Features that work on Twitter don't necessarily work on Bluesky.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  4. Small user validation beats assumptions
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Getting feedback from just 33 real users taught me more than months of assumptions. Always ship early and listen.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-8 mb-12 text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Still want to use it?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              All features are free. Sign up, connect your Bluesky account, and use whatever you find helpful. No strings attached.
            </p>
            <Button 
              size="lg"
              onClick={() => window.location.href = '/dashboard'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Get Started (Free)
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          {/* Fork/Maintain Section */}
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Want to fork or maintain it yourself?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The codebase is a hybrid TypeScript/Python app with AdonisJS backend, React frontend, and ML-powered audience analysis. If you want to self-host or continue development:
            </p>
            <div className="flex flex-wrap gap-4">
              <a 
                href="https://github.com/Nallanos/Bluesky-copilot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
              >
                <Github className="w-5 h-5 mr-2" />
                View on GitHub
              </a>
              <a 
                href="mailto:benameurallan06@gmail.com"
                className="inline-flex items-center px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Mail className="w-5 h-5 mr-2" />
                Get in Touch
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Built by a 17-year-old learning the hard way.
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              Now building the next thing with better validation this time.
            </p>
            <div className="mt-4 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
              Made with <Heart className="w-4 h-4 mx-1 text-red-500" /> and expensive lessons
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

export default Home
