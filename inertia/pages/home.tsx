import { Head } from '@inertiajs/react'
import { Button } from '../components/ui/button'
import {
  CheckCircle,
  ArrowRight,
  Sun,
  Moon,
  Brain,
  Target,
  Zap,
  Timer,
} from 'lucide-react'
import { useState, useEffect } from 'react'

// TypeScript declaration for gtag (Google Analytics)
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

// Utility function for tracking events
const trackEvent = (eventName: string, parameters: Record<string, any> = {}) => {
  try {
    // Google Analytics 4 event tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, parameters)
    }

    // Console log for development
    console.log('📈 Event Tracked:', eventName, parameters)
  } catch (error) {
    console.warn('Event tracking failed:', error)
  }
}

// Composant carrousel pour les profils utilisateurs
const UserProfileCarousel = ({ userHandles, totalUsers }: { userHandles: string[], totalUsers: number }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [profileImages, setProfileImages] = useState<{[key: string]: string}>({})
  const [isLoaded, setIsLoaded] = useState(false)

  // Auto-rotation du carrousel - défilement plus fluide
  useEffect(() => {
    // Filtrer pour ne garder que les handles avec des vraies photos
    const handlesWithPhotos = userHandles.filter(handle => profileImages[handle])
    if (handlesWithPhotos.length === 0) return
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.max(handlesWithPhotos.length - 4, 1))
    }, 2500) // Animation plus rapide

    return () => clearInterval(interval)
  }, [userHandles, profileImages])

  // Fonction pour récupérer le profil Bluesky
  const getBlueskyProfile = async (handle: string) => {
    try {
      // Utiliser l'API Bluesky correcte pour récupérer le profil complet
      const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${handle}`)
      
      if (response.ok) {
        const data = await response.json()
        
        // Retourner l'avatar s'il existe
        if (data.avatar) {
          return data.avatar
        }
      }
    } catch (error) {
      console.error('Error fetching profile for', handle, error)
    }
    return null
  }

  // Charger les images de profil pour tous les utilisateurs
  useEffect(() => {
    const loadProfileImages = async () => {
      const images: {[key: string]: string} = {}
      
      // Charger les 20 premiers profils
      for (const handle of userHandles.slice(0, 20)) {
        const avatar = await getBlueskyProfile(handle)
        if (avatar) {
          images[handle] = avatar
        }
        // Ne pas ajouter de fallback - on ne garde que les vraies photos
      }
      
      setProfileImages(images)
    }

    if (userHandles.length > 0) {
      loadProfileImages()
    }
  }, [userHandles])

  // Images de fallback statiques
  const fallbackImages = [
    "/images/bafkreihdgxviv4vxx7dv4zfwhjylkmbharti2s7jhlndmu4nswpwhk677e.jpg",
    "/images/pdpDemon.jpg", 
    "/images/nallanos.jpg"
  ]

  if (userHandles.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="flex -space-x-2">
          {fallbackImages.map((img, index) => (
            <div key={index} className="relative">
              <img
                src={img}
                alt="User profile"
                className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 shadow-lg"
              />
            </div>
          ))}
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-lg">
            <span className="text-white text-xs font-bold">+</span>
          </div>
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">
          Trusted by creators worldwide
        </span>
      </div>
    )
  }

  // Obtenir les profils visibles avec de vraies photos seulement
  const getVisibleProfiles = () => {
    // Filtrer pour ne garder que les handles avec des vraies photos
    const handlesWithPhotos = userHandles.filter(handle => profileImages[handle])
    
    if (handlesWithPhotos.length === 0) return []
    
    const profiles = []
    const visibleCount = Math.min(5, handlesWithPhotos.length)
    
    for (let i = 0; i < visibleCount; i++) {
      const index = (currentIndex + i) % handlesWithPhotos.length
      const handle = handlesWithPhotos[index]
      const avatar = profileImages[handle]
      
      profiles.push({
        id: `${handle}-${index}`,
        avatar,
        handle
      })
    }
    
    return profiles
  }

  const visibleProfiles = getVisibleProfiles()

  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      <div className="relative overflow-hidden">
        <div className="flex -space-x-3 transition-transform duration-1000 ease-in-out carousel-container">
          {visibleProfiles.map((profile, index) => (
            <div 
              key={profile.id} 
              className="relative transform transition-all duration-500 hover:scale-110 hover:z-10 animate-slideInProfile"
              style={{
                animationDelay: `${index * 150}ms`,
                transform: `translateX(${index * 2}px)`
              }}
            >
              <img
                src={profile.avatar}
                alt={`@${profile.handle}`}
                className="w-12 h-12 rounded-full border-3 border-white dark:border-gray-800 shadow-lg object-cover transition-transform duration-300"
              />
              {/* Indicateur d'activité animé sur le premier profil */}
              {index === 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
              )}
              {/* Overlay au hover */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          ))}
          
          {/* Indicateur "+X" seulement s'il y a plus de profils avec photos */}
          {userHandles.filter(handle => profileImages[handle]).length > 5 && (
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 border-3 border-white dark:border-gray-800 flex items-center justify-center shadow-lg">
              <span className="text-white text-xs font-bold">+{userHandles.filter(handle => profileImages[handle]).length - 5}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          Trusted by {totalUsers}+ creators
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Join the community
        </span>
      </div>
    </div>
  )
}

interface BusinessPlanCounter {
  currentCount: number
  maxSpots: number
  availableSpots: number
  canSignUp: boolean
  totalUsers: number
  userHandles: string[]
}

interface Props {
  businessPlanCounter?: BusinessPlanCounter
}

// Components
const Navigation = ({ darkMode, toggleTheme }: { darkMode: boolean; toggleTheme: () => void }) => (
  <nav className="w-full bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
    <div className="max-w-7xl mx-auto flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4">
      {/* Logo */}
      <div className="flex items-center">
        <div className="flex items-center space-x-2">
          <div className="w-6 sm:w-8 h-6 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs sm:text-sm">SK</span>
          </div>
          <span className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white">Skylume</span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Boutons droite */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        <a
          href="/pricing"
          className="hidden sm:block text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors text-sm sm:text-base"
        >
          Pricing
        </a>
        <Button
          variant={"cta"}
          onClick={() => {
            trackEvent('cta_click', {
              button_text: 'Start Creating',
              button_location: 'navigation',
              page: '/'
            })
            window.location.href = '/dashboard'
          }}
          className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-medium rounded-lg transition-all duration-300 text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Start Creating
        </Button>
        
        {/* Toggle Theme Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle theme"
        >
          {darkMode ? (
            <Sun className="w-4 sm:w-5 h-4 sm:h-5 text-yellow-500" />
          ) : (
            <Moon className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600" />
          )}
        </button>
      </div>
    </div>
  </nav>
)

const HeroSection = ({ businessPlanCounter }: { businessPlanCounter?: BusinessPlanCounter }) => (
  <section className="relative flex flex-col justify-center items-center text-center px-4 sm:px-6 pt-12 sm:pt-16 pb-16 sm:pb-20 overflow-hidden w-full bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300">
    {/* Fond animé similaire au Svelte */}
    <div className="absolute inset-0 w-full opacity-10 dark:opacity-20">
      <div className="absolute top-10 sm:top-20 left-5 sm:left-10 w-48 sm:w-72 h-48 sm:h-72 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
      <div
        className="absolute bottom-16 sm:bottom-32 right-5 sm:right-10 w-48 sm:w-72 h-48 sm:h-72 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"
        style={{ animationDelay: '2s' }}
      ></div>
    </div>

    <div className="max-w-4xl mb-6 sm:mb-8 relative z-10">
      {/* Compteur des places limitées */}
      {businessPlanCounter && businessPlanCounter.canSignUp && (
        <div className="mb-6 sm:mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 text-red-800 dark:text-red-200 rounded-full text-sm font-bold border border-red-200 dark:border-red-800">
            <Timer className="w-4 h-4 mr-2" />
            <span>🔥 Special Launch: Only {businessPlanCounter.availableSpots} spots left at $1/month!</span>
          </div>
        </div>
      )}

      <div className="mb-4 sm:mb-6 flex justify-center items-center gap-2">
        <div className="bg-blue-100 dark:bg-blue-900/30 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          🎉 Completely Free, No Credit Card Required
        </div>
      </div>
      <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight text-gray-900 dark:text-white">
        The Best <span className="text-blue-500">Scheduling Tool</span> for Bluesky Creators
      </h1>
      
      {/* Carrousel de profils utilisateurs - Preuve sociale - DÉPLACÉ SOUS LE TITRE */}
      <div className="mb-6 sm:mb-8">
      </div>
      
      <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 px-2">
        Create consistently. Grow authentically. Engage effortlessly. The scheduling tool that understands creators.
      </p>

        <UserProfileCarousel 
          userHandles={businessPlanCounter?.userHandles || []} 
          totalUsers={businessPlanCounter?.totalUsers || 10}
        />
      <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-3 sm:mb-4 px-4">
        <Button 
          variant="cta" 
          size="cta" 
          onClick={() => {
            trackEvent('cta_click', {
              button_text: 'Start Creating Consistently',
              button_location: 'hero_section',
              page: '/'
            })
            window.location.href = '/dashboard'
          }} 
          className="w-full sm:w-auto"
        >
          🎨 Start Creating Consistently
          <ArrowRight className="w-5 h-5" />
        </Button>
        {businessPlanCounter?.canSignUp && (
          <Button 
            variant="outline" 
            size="cta" 
            onClick={() => {
              trackEvent('cta_click', {
                button_text: 'Get $1/month deal',
                button_location: 'hero_section',
                page: '/'
              })
              window.location.href = '/pricing'
            }} 
            className="w-full sm:w-auto border-2 border-gold-500 text-gold-700 hover:bg-gold-50 dark:border-gold-400 dark:text-gold-300 dark:hover:bg-gold-900/20"
          >
            🔥 Get $1/month deal
          </Button>
        )}
      </div>
      <div className="text-center">
        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
          100% Free - Start building your creative presence today
        </p>
      </div>
    </div>
  </section>
)

const UniqueValueSection = () => (
  <section className="py-12 px-4 bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300 relative overflow-hidden">
    <div className="absolute inset-0 opacity-5 dark:opacity-10">
      <div className="absolute top-0 left-1/4 w-32 h-32 bg-blue-400 rounded-full filter blur-2xl"></div>
      <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-blue-600 rounded-full filter blur-2xl"></div>
    </div>
    <div className="max-w-4xl mx-auto text-center relative z-10">
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
        🚀 Unlike Buffer or Hootsuite...
      </h2>
      <p className="text-lg md:text-xl mb-6 text-gray-600 dark:text-gray-300">
        <strong>The only tool built specifically</strong> for Bluesky creators and their unique needs
      </p>
      <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <span className="text-lg">❌</span>
          </div>
          <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Others: Generic social tools</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <span className="text-lg">✅</span>
          </div>
          <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Skylume: Bluesky-native features</span>
        </div>
      </div>
    </div>
  </section>
)

const ProblemSolutionSection = () => (
  <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          Break Through the Creator's Biggest Struggle
        </h2>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
          Stop letting inconsistency kill your creative momentum.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="p-6 md:p-8 bg-white dark:bg-gray-900/50 rounded-xl border border-blue-200 dark:border-blue-900 shadow-sm">
          <div className="text-blue-500 dark:text-blue-400 text-sm mb-2 font-semibold">
            The Problem
          </div>
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            The Fear Every Creator Knows Too Well
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            You pour your heart into creating. But life gets busy. You skip a day. Then another.
          </p>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Your audience forgets you exist. Your momentum dies. Your dreams feel further away.
          </p>
        </div>
        <div className="p-6 md:p-8 bg-white dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
          <div className="text-blue-500 dark:text-blue-400 text-sm mb-2 font-semibold">
            Our Solution
          </div>
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Never Miss Your Creative Window Again
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Schedule when inspiration strikes. Post when your audience is ready. Stay consistent effortlessly.
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            Built for creators who understand that consistency is the bridge between talent and success.
          </p>
        </div>
      </div>
      
      {/* Comparison Section */}
      <div className="mt-16 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            Why Creators Choose Skylume
          </h3>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-gray-100 dark:bg-gray-800/30 rounded-xl text-center">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Buffer/Hootsuite</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Generic scheduling, not creator-focused</p>
            <p className="text-xs text-red-500 mt-2">❌ No Bluesky-native features</p>
          </div>
          <div className="p-6 bg-gray-100 dark:bg-gray-800/30 rounded-xl text-center">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Generic Social Tools</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Built for marketers, not creators</p>
            <p className="text-xs text-red-500 mt-2">❌ No understanding of creative workflow</p>
          </div>
          <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl text-center border-2 border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">Skylume</h4>
            <p className="text-sm text-blue-600 dark:text-blue-400">Made by creators, for creators</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">✅ Built for creative consistency</p>
          </div>
        </div>
      </div>
    </div>
  </section>
)

// Section Crossposting et Scheduling
const CrosspostingSection = () => (
  <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900 transition-colors duration-300 relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute inset-0 opacity-5 dark:opacity-10">
      <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-blue-600 rounded-full filter blur-3xl"></div>
    </div>
    
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Text Content */}
        <div className="space-y-8 px-4 sm:px-0">
          <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 px-4 md:px-6 py-3 rounded-full text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <span className="mr-2">🚀</span>
            Crossposting & Scheduling
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-gray-900 dark:text-white">
            Post everywhere,{' '}
            <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              manage from one place
            </span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Schedule and crosspost to Bluesky and X simultaneously. Videos, images, hashtags with smart formatting.
          </p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Multi-Platform Posting</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Crosspost to Bluesky and X with platform-specific optimization
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Rich Media Support</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Upload videos, images, GIFs with automatic compression
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Scheduling</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  AI-powered timing, hashtag suggestions, link shortening
                </p>
              </div>
            </div>
          </div>
          <div className="pt-6">
            <Button
              variant="cta"
              size="cta"
              onClick={() => {
                trackEvent('cta_click', {
                  button_text: 'Start My Creative Journey',
                  button_location: 'scheduling_section',
                  page: '/'
                })
                window.location.href = '/dashboard'
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Start My Creative Journey
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Image */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 transform hover:scale-105 transition-transform duration-500 mx-4 sm:mx-0 cursor-pointer">
          <img
            src="/images/queueSchedulingLight.png"
            alt="Crossposting Dashboard"
            className="w-full h-[400px] md:h-[450px] object-cover object-top select-text block dark:hidden"
            onClick={() => window.open('/images/queueSchedulingLight.png', '_blank')}
          />
          <img
            src="/images/scheduleDashboard.png"
            alt="Crossposting Dashboard"
            className="w-full h-[400px] md:h-[450px] object-cover object-top select-text hidden dark:block"
            onClick={() => window.open('/images/scheduleDashboard.png', '_blank')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
        </div>
      </div>
    </div>
  </section>
)


// Section Analytics Globale
const AnalyticsSection = () => (
  <section className="py-20 px-4 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300 relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute inset-0 opacity-5 dark:opacity-10">
      <div className="absolute top-32 left-16 w-72 h-72 bg-blue-400 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-16 right-32 w-56 h-56 bg-blue-600 rounded-full filter blur-3xl"></div>
    </div>
    
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Text Content */}
        <div className="space-y-8">
          <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 px-6 py-3 rounded-full text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <span className="mr-2">📊</span>
            Advanced Analytics
          </div>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 dark:text-white">
            Complete analytics{' '}
            <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              dashboard
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Get a comprehensive overview of your Bluesky performance. Track your growth, analyze your best posts, and understand your audience like never before.
          </p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Complete History</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Track your followers and following evolution with detailed historical data
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Performance Analysis</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Discover which posts perform best and understand what resonates with your audience
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Engagement Metrics</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Get detailed insights on likes, reposts, replies and engagement trends over time
                </p>
              </div>
            </div>
          </div>
          <div className="pt-6">
            <Button
              variant="cta"
              size="cta"
              onClick={() => {
                trackEvent('cta_click', {
                  button_text: 'Start Growing Consistently',
                  button_location: 'analytics_section',
                  page: '/'
                })
                window.location.href = '/dashboard'
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Start Growing Consistently
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Image */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 transform hover:scale-105 transition-transform duration-500 cursor-pointer">
          <img
            src="/images/AccountDashboardLight.png"
            alt="Analytics Dashboard Global"
            className="w-full object-cover object-top select-text block dark:hidden"
            onClick={() => window.open('/images/AccountDashboardLight.png', '_blank')}
          />
          <img
            src="/images/analytics.png"
            alt="Analytics Dashboard Global"
            className="w-full h-[400px] md:h-[450px] object-cover object-top select-text hidden dark:block"
            onClick={() => window.open('/images/analytics.png', '_blank')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
        </div>
      </div>
    </div>
  </section>
)

// Section Relationship Tracker Evolution
const RelationshipTrackerSection = () => (
  <section className="py-20 px-4 bg-white dark:bg-gray-900 transition-colors duration-300 relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute inset-0 opacity-5 dark:opacity-10">
      <div className="absolute top-40 right-24 w-80 h-80 bg-blue-500 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-32 left-16 w-64 h-64 bg-blue-600 rounded-full filter blur-3xl"></div>
    </div>
    
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Image */}
        <div className="order-2 lg:order-1">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 transform hover:scale-105 transition-transform duration-500 cursor-pointer">
            <img
              src="/images/RelationshipDashboardLight.png"
              alt="Relationship Evolution Tracker"
              className="w-full h-[400px] md:h-[450px] object-cover object-top select-text block dark:hidden"
              onClick={() => window.open('/images/RelationshipDashboardLight.png', '_blank')}
            />
            <img
              src="/images/relationshiptracker.png"
              alt="Relationship Evolution Tracker"
              className="w-full h-[400px] md:h-[450px] object-cover object-top select-text hidden dark:block"
              onClick={() => window.open('/images/relationshiptracker.png', '_blank')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
          </div>
        </div>

        {/* Text Content */}
        <div className="order-1 lg:order-2 space-y-8">
          <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 px-6 py-3 rounded-full text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <span className="mr-2">📈</span>
            Relationship Tracking
          </div>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 dark:text-white">
            Track the evolution of{' '}
            <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              your relationships
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Visualize in real-time the evolution of your follower/following relationships. Identify trends, detect changes, and optimize your growth strategy.
          </p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Timeline Charts</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Visualize your relationship evolution with beautiful, interactive timeline charts
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Real-time Detection</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Get instant notifications when someone unfollows you or changes their relationship status
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Complete History</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Access comprehensive records of all your social interactions and relationship changes
                </p>
              </div>
            </div>
          </div>
          <div className="pt-6">
            <Button
              variant="cta"
              size="cta"
              onClick={() => {
                trackEvent('cta_click', {
                  button_text: 'Build My Creative Presence',
                  button_location: 'relationships_section',
                  page: '/'
                })
                window.location.href = '/dashboard'
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Build My Creative Presence
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
)

// Section DM Campaign - Prospection automatisée
const DMCampaignSection = () => (
  <section className="py-20 md:py-24 px-4 bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300 relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute inset-0 opacity-10 dark:opacity-20">
      <div className="absolute top-20 left-10 w-72 md:w-96 h-72 md:h-96 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-64 md:w-80 h-64 md:h-80 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
    </div>
    
    <div className="max-w-6xl mx-auto text-center relative z-10">
      <div className="space-y-8 md:space-y-12">
        {/* Badge */}
        <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 px-6 md:px-8 py-3 md:py-4 rounded-full text-sm md:text-base font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-lg">
          <span className="mr-3 text-lg md:text-xl">🎯</span>
          Audience Intelligence
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight text-gray-900 dark:text-white">
          Advanced audience insights with{' '}
          <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
            smart targeting
          </span>
        </h2>

        {/* Description */}
        <p className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
          Understand your audience deeply. Create targeted content that resonates. 
          Build meaningful connections with your community.
        </p>

        {/* Image */}
        <div className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 max-w-6xl mx-auto transform hover:scale-105 transition-transform duration-500 cursor-pointer">
          <img
            src="/images/DMDahsboardLight.png"
            alt="DM Campaign Dashboard"
            className="w-full object-cover object-top select-text block dark:hidden"
            onClick={() => window.open('/images/DMDahsboardLight.png', '_blank')}
          />
          <img
            src="/images/dmCampaign.png"
            alt="DM Campaign Dashboard"
            className="w-full h-[450px] md:h-[500px] object-cover object-top select-text hidden dark:block"
            onClick={() => window.open('/images/dmCampaign.png', '_blank')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-10 mt-12 md:mt-16">
          <div className="text-center space-y-4 md:space-y-6 p-6 md:p-8 bg-white/60 dark:bg-gray-800/30 rounded-xl md:rounded-2xl border border-blue-100 dark:border-blue-800/30 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/50 transition-all duration-300">
            <div className="w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Target className="w-8 md:w-10 h-8 md:h-10 text-blue-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Deep Audience Understanding</h3>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
              Analyze followers by interests, engagement patterns, and content preferences. 
              Create content that truly connects with your community.
            </p>
          </div>
          <div className="text-center space-y-4 md:space-y-6 p-6 md:p-8 bg-white/60 dark:bg-gray-800/30 rounded-xl md:rounded-2xl border border-blue-100 dark:border-blue-800/30 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/50 transition-all duration-300">
            <div className="w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Zap className="w-8 md:w-10 h-8 md:h-10 text-blue-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Smart Content Personalization</h3>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
              Use audience insights to craft personalized content and messages. 
              Build authentic connections that convert followers into true fans.
            </p>
          </div>
          <div className="text-center space-y-4 md:space-y-6 p-6 md:p-8 bg-white/60 dark:bg-gray-800/30 rounded-xl md:rounded-2xl border border-blue-100 dark:border-blue-800/30 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/50 transition-all duration-300 md:col-span-2 lg:col-span-1">
            <div className="w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Brain className="w-8 md:w-10 h-8 md:h-10 text-blue-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Growth-Focused Automation</h3>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
              Set up once, grow consistently. Smart scheduling, audience insights, 
              and engagement tracking to build your creative community.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-8 md:pt-12">
          <Button
            variant="cta"
            size="cta"
            onClick={() => {
              trackEvent('cta_click', {
                button_text: 'Build My Audience',
                button_location: 'dm_campaigns_section',
                page: '/'
              })
              window.location.href = '/dashboard'
            }}
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 px-8 md:px-12 py-4 md:py-5 text-lg md:text-xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
          >
            Build My Audience
            <ArrowRight className="w-6 md:w-7 h-6 md:h-7" />
          </Button>
          <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg mt-4 md:mt-6">
            100% Free - Start building authentic connections
          </p>
        </div>
      </div>
    </div>
  </section>
)



const VideoSection = () => (
  <section className="py-24 px-4 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300 relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute inset-0 opacity-5 dark:opacity-10">
      <div className="absolute top-32 left-20 w-72 h-72 bg-blue-500 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-20 right-24 w-64 h-64 bg-blue-600 rounded-full filter blur-3xl"></div>
    </div>
    
    <div className="max-w-7xl mx-auto relative z-10 text-center">
      {/* Header Content */}
      <div className="mb-16 space-y-8">
        <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 px-6 py-3 rounded-full text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          <span className="mr-2">🎬</span>
          Product Demo
        </div>
        <h2 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 dark:text-white max-w-4xl mx-auto">
          Transform Your Bluesky Strategy{' '}
          <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
            in 90 Seconds
          </span>
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto">
          See how our AI-powered platform helps you automate engagement and grow your audience
          effortlessly. This quick demo shows our key features in action.
        </p>
      </div>

      {/* Centered Large Video */}
      <div className="mb-16">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 transform hover:scale-105 transition-transform duration-500 max-w-6xl mx-auto cursor-pointer">
          <video
            className="w-full h-[400px] md:h-[450px] object-cover select-text"
            src="/videos/landing_video.mp4"
            autoPlay
            muted
            loop
            playsInline
          >
            Your browser does not support the video tag.
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
        <div className="flex items-start gap-4 text-left">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Audience Analysis</h4>
            <p className="text-gray-600 dark:text-gray-300">
              Advanced keyword-based bio embeddings for precise audience segmentation
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4 text-left">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Effortless Automation</h4>
            <p className="text-gray-600 dark:text-gray-300">
              Follower tracking and post scheduling that works while you sleep
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="pt-6">
        <Button 
          variant="cta" 
          size="cta" 
          onClick={() => {
            trackEvent('cta_click', {
              button_text: 'Start Creating Today',
              button_location: 'final_cta_section',
              page: '/'
            })
            window.location.href = '/dashboard'
          }}
          className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
        >
          Start Creating Today
          <ArrowRight className="w-5 h-5" />
        </Button>
        <p className="text-gray-500 dark:text-gray-400 text-lg mt-4">
          100% Free - Begin your creative journey
        </p>
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
  <div className="p-8 bg-white/80 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl backdrop-blur-sm hover:shadow-2xl hover:bg-white dark:hover:bg-gray-800/70 transition-all duration-300 transform hover:scale-105">
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div className="w-14 h-14 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <img className="w-12 h-12 rounded-xl object-cover" src={avatar} alt={handle} />
          </div>
        </div>
        <div>
          {link ? (
            <a
              href={link}
              className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 underline transition-colors font-semibold"
              target="_blank"
              rel="noopener noreferrer"
            >
              {handle}
            </a>
          ) : (
            <p className="text-blue-500 dark:text-blue-400 font-semibold">{handle}</p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
        </div>
      </div>
      <blockquote className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
        "{quote}"
      </blockquote>
    </div>
  </div>
)

const TestimonialsSection = () => (
  <section className="py-24 px-4 bg-white dark:bg-gray-900 transition-colors duration-300 relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute inset-0 opacity-5 dark:opacity-10">
      <div className="absolute top-20 left-32 w-80 h-80 bg-blue-400 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-32 right-20 w-72 h-72 bg-blue-600 rounded-full filter blur-3xl"></div>
    </div>
    
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="text-center mb-16">
        <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 px-6 py-3 rounded-full text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 mb-8">
          <span className="mr-2">💬</span>
          Customer Success Stories
        </div>
        <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
          They're already growing faster
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Join thousands of creators and businesses who've transformed their Bluesky presence
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <TestimonialCard
          avatar="/images/bafkreihdgxviv4vxx7dv4zfwhjylkmbharti2s7jhlndmu4nswpwhk677e.jpg"
          handle="@alexisbouchez.com"
          title="Founder"
          quote="Making use of Skylume is a great way to grow and engage with your audience on Bluesky."
          link="https://bsky.app/profile/alexisbouchez.com"
        />
        <TestimonialCard
          avatar="/images/pdpDemon.jpg"
          handle="@dem...ny.bsky.social"
          title="Content creator"
          quote="I started using the Skylume to help grow my platform, and honestly, it's been a game changer."
        />
        <TestimonialCard
          avatar="/images/nallanos.jpg"
          handle="@allanbe.bsky.social"
          title="Founder"
          quote="I use the tool myself on a daily basis, and each update is designed to make the experience even smoother."
          link="https://bsky.app/profile/allanbe.bsky.social"
        />
      </div>
    </div>
  </section>
)

const Footer = () => (
  <footer className="border-t border-gray-200 dark:border-gray-800 pt-8 sm:pt-12 mt-12 sm:mt-16 bg-white dark:bg-gray-900 transition-colors duration-300">
    <div className="container mx-auto px-4">
      <div className="py-6 sm:py-8 flex flex-col lg:flex-row justify-between items-start gap-6 sm:gap-8">
        <div className="text-center lg:text-left mb-6 lg:mb-0 w-full lg:w-auto">
          <div className="mb-3">
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              Bluesky Tools
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
            © 2024 Made with ❤️ par{' '}
            <a
              href="https://bsky.app/profile/allanbe.bsky.social"
              className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              allanbe.bsky.social
            </a>
          </p>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-3xl w-full lg:w-auto">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-blue-500 dark:text-blue-400 mb-3 sm:mb-4">Quick Links</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <a
                  href="/terms"
                  className="text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  Terms
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  className="text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  href="/pricing"
                  className="text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-blue-500 dark:text-blue-400 mb-3 sm:mb-4">FAQ</h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <h4 className="text-sm sm:text-base text-blue-500 dark:text-blue-400 font-semibold mb-1 sm:mb-2">
                  How long does it take to set up?
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
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
  const [darkMode, setDarkMode] = useState(true) // Thème sombre par défaut
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Vérifier d'abord localStorage, sinon utiliser le thème sombre par défaut
    const savedTheme = localStorage.getItem('darkMode')
    const isDark = savedTheme ? savedTheme === 'true' : true // Thème sombre par défaut

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

function Home({ businessPlanCounter }: Props) {
  const { darkMode, mounted, toggleTheme } = useTheme()

  // Track page view manually for SPA route change
  useEffect(() => {
    if (mounted) {
      // Manual page view tracking for home route
      const trackPageView = () => {
        try {
          // Check if gtag is available (Google Analytics)
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
              page_title: 'Home - Skylume',
              page_location: window.location.href
            })
          }

          // Custom analytics endpoint (if you have one)
          // fetch('/api/analytics/page-view', {
          //   method: 'POST',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify({
          //     page: '/',
          //     title: 'Home - Skylume',
          //     url: window.location.href,
          //     timestamp: new Date().toISOString()
          //   })
          // }).catch(err => console.warn('Analytics tracking failed:', err))

          // Console log for development tracking
          console.log('📊 Page View Tracked:', {
            page: '/',
            title: 'Home - Skylume',
            url: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          })
        } catch (error) {
          console.warn('Page view tracking failed:', error)
        }
      }

      // Track page view on mount
      trackPageView()
    }
  }, [mounted])

  // Éviter le flash avant hydratation
  if (!mounted) {
    return null
  }

  return (
    <>
      <Head title="Skylume - The Best Bluesky Scheduling Tool for Creators | Artists & Writers">
        <meta name="description" content="The best scheduling tool for Bluesky creators, artists, and writers. Create consistently, grow authentically, and build your creative presence with smart scheduling and audience insights." />
        <meta name="keywords" content="bluesky scheduling, bluesky creators, bluesky artists, bluesky writers, content creators, bluesky tool, social media scheduling, creative consistency" />
        
        {/* Google Search Console Verification - REMPLACEZ PAR VOTRE CODE */}
        
        {/* Open Graph */}
        <meta property="og:title" content="Skylume - The Best Bluesky Scheduling Tool for Creators" />
        <meta property="og:description" content="Create consistently, grow authentically. The scheduling tool built specifically for Bluesky creators, artists, and writers." />
        <meta property="og:url" content="https://skylume.app" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Skylume" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Skylume - Best Bluesky Scheduling Tool for Creators" />
        <meta name="twitter:description" content="The scheduling tool that understands creators. Built specifically for Bluesky artists, writers, and content creators." />
        <meta name="twitter:site" content="@skynalytic" />
        
        {/* Additional SEO Meta */}
        <meta name="author" content="Skylume" />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="en" />
        <meta name="revisit-after" content="7 days" />
        <link rel="canonical" href="https://skylume.app" />
        
        {/* Schema Markup - SoftwareApplication */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Skylume",
              "description": "The best scheduling and audience intelligence tool for Bluesky creators, artists, and writers. Create consistently and grow authentically.",
              "url": "https://skylume.app",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
                "description": "Free plan available"
              },
              "creator": {
                "@type": "Organization",
                "name": "Skylume",
                "url": "https://skylume.app"
              },
              "featureList": [
                "Smart Scheduling",
                "Audience Intelligence", 
                "Creator Analytics",
                "Consistency Tools",
                "Growth Tracking",
                "Community Building"
              ]
            }
          `}
        </script>
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('darkMode');
                  const isDark = savedTheme ? savedTheme === 'true' : true; // Thème sombre par défaut
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        
        {/* Styles personnalisés pour l'animation du carousel */}
        <style>
          {`
            @keyframes slideInProfile {
              0% {
                opacity: 0;
                transform: translateX(-30px) scale(0.7);
              }
              50% {
                opacity: 0.5;
                transform: translateX(-10px) scale(0.9);
              }
              100% {
                opacity: 1;
                transform: translateX(0) scale(1);
              }
            }
            
            .profile-item {
              opacity: 0;
              animation: slideInProfile 0.8s ease-out forwards;
            }
            
            /* Animation de défilement fluide pour le conteneur */
            .carousel-container {
              transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* Animation d'apparition progressive */
            @keyframes fadeInUp {
              0% {
                opacity: 0;
                transform: translateY(20px);
              }
              100% {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            .carousel-wrapper {
              animation: fadeInUp 0.5s ease-out;
            }
          `}
        </style>
      </Head>
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
        <Navigation darkMode={darkMode} toggleTheme={toggleTheme} />
        <HeroSection businessPlanCounter={businessPlanCounter} />
        <UniqueValueSection />
        <ProblemSolutionSection />
        <CrosspostingSection />
        <AnalyticsSection />
        <TestimonialsSection />
        <RelationshipTrackerSection />
        <VideoSection />
        <DMCampaignSection />
        <Footer />
      </div>
    </>
  )
}

export default Home
