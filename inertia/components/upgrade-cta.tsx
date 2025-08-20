import React from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { TrendingUp, Users, Calendar, Zap, ArrowRight, Sparkles } from 'lucide-react'

interface UpgradeSuggestion {
  type: string
  message: string
  ctaText: string
  recommendedPlan: string
}

interface Props {
  suggestions: UpgradeSuggestion[]
  currentPlan: string
}

const UpgradeCTA: React.FC<Props> = ({ suggestions, currentPlan }) => {
  if (suggestions.length === 0 || currentPlan !== 'free') {
    return null
  }

  const handleUpgrade = (plan: string) => {
    // Redirect directly to Stripe checkout
    if (plan === 'pro' || plan === 'business') {
      window.location.href = `/stripe/checkout/${plan}`
      return
    }
    
    // Fallback to pricing page
    window.location.href = '/pricing'
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'scheduledPosts': return Calendar
      case 'accounts': return Users
      case 'followerLoadings': return TrendingUp
      default: return Sparkles
    }
  }

  const getGradient = (plan: string) => {
    return plan === 'business' 
      ? 'from-purple-500 to-pink-600' 
      : 'from-blue-500 to-blue-700'
  }

  // Prendre la première suggestion pour l'affichage principal
  const mainSuggestion = suggestions[0]
  const Icon = getIcon(mainSuggestion.type)
  const gradient = getGradient(mainSuggestion.recommendedPlan)

  return (
    <Card className={`relative overflow-hidden border-0 bg-gradient-to-br ${gradient} text-white shadow-lg`}>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <Zap className="w-full h-full" />
      </div>
      
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-5 w-5" />
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Limite atteinte
              </Badge>
            </div>
            
            <h3 className="text-lg font-semibold mb-2">
              Débloquez plus de fonctionnalités
            </h3>
            
            <p className="text-white/90 text-sm mb-4">
              {mainSuggestion.message}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => handleUpgrade(mainSuggestion.recommendedPlan)}
                className="bg-white text-gray-900 hover:bg-gray-100 font-medium"
              >
                {mainSuggestion.ctaText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.href = '/pricing'}
                className="border-white/30 text-white hover:bg-white/10"
              >
                Voir tous les plans
              </Button>
            </div>
          </div>
        </div>
        
        {suggestions.length > 1 && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-xs text-white/80">
              + {suggestions.length - 1} autre{suggestions.length > 2 ? 's' : ''} limite{suggestions.length > 2 ? 's' : ''} atteinte{suggestions.length > 2 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UpgradeCTA
