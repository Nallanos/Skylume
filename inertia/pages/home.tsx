import { Head } from '@inertiajs/react'
import { Button } from '../components/ui/button'
import { Sun, Moon, Github, Mail, ArrowRight } from 'lucide-react'
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
        <meta name="description" content="Skylume is free and open source now, after a year of building it as a paid Bluesky automation product." />
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
            <p className="text-gray-600 dark:text-gray-400">
              I spent about a year building growth automation for Bluesky: follower automation, DM campaigns, audience clustering, scheduling. The kind of tools that work well on other platforms.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800/50 border-l-4 border-blue-500 p-6 rounded-r-lg my-8">
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-0">
                Turns out Bluesky's community came here specifically to get away from that kind of thing — the growth hacking and automation culture of Twitter/X.
              </p>
            </div>

            <p className="text-gray-600 dark:text-gray-400">
              That's a feature, not a bug. And I respect it.
            </p>
          </div>

          {/* What Happens Now */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 border border-green-200 dark:border-green-800 rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">What this means</h2>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span>Everything is free — no paywalls, no subscriptions, no credit card.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span>It'll stay online for as long as server costs allow, probably years.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span>Existing subscriptions are already cancelled. You won't be charged again.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span>The code is on GitHub for anyone who wants to fork it or run their own copy.</span>
              </li>
            </ul>
          </div>

          {/* What I'd do differently */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">What I'd do differently</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-400">
              <p>
                Talk to actual users before writing code, not after. I built first and validated later, which is backwards and cost me a year.
              </p>
              <p>
                And it's not just about listening to feedback in general — building automation tools for a platform whose whole identity is anti-automation was never going to work, no matter how well it was built. Feature quality doesn't fix a platform-culture mismatch.
              </p>
              <p>
                Talking to the roughly 33 people who actually tried it taught me more than months of guessing had.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-8 mb-12 text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Still want to use it?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              All features are free. Sign up, connect your Bluesky account, and use whatever you find helpful.
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
              AdonisJS backend, React frontend, BullMQ for the job queue. There's also an in-app audience clustering feature (Transformers.js embeddings + k-means) and a separate, older Python clustering experiment in <code>python-service/</code> that isn't wired into the running app anymore.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://github.com/Nallanos/Skylume"
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

        </div>
      </div>
    </>
  )
}

export default Home
