import React from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Sparkles, ArrowRight, Crown, Zap } from 'lucide-react'

interface Props {
  feature: string
  currentPlan: string
  requiredPlan: 'pro' | 'business'
  compact?: boolean
  className?: string
}

const FeatureUpgradePrompt: React.FC<Props> = ({ 
  feature, 
  currentPlan, 
  requiredPlan, 
  compact = false,
  className = '' 
}) => {
  if (currentPlan === requiredPlan || currentPlan === 'business') {
    return null
  }

  const features = {
    'dm-campaigns': {
      title: 'Campagnes DM',
      description: 'Automatisez vos messages directs et engagez votre audience',
      proFeature: 'Analyse des followers',
      businessFeature: 'Exécution automatique'
    },
    'unlimited-posts': {
      title: 'Posts illimités',
      description: 'Programmez autant de posts que vous voulez',
      proFeature: 'Scheduling illimité',
      businessFeature: 'Analytics avancées'
    },
    'unlimited-accounts': {
      title: 'Comptes illimités',
      description: 'Gérez tous vos comptes Bluesky depuis un seul endroit',
      proFeature: 'Comptes illimités',
      businessFeature: 'Gestion multi-équipe'
    },
    'advanced-analytics': {
      title: 'Analytics avancées',
      description: 'Obtenez des insights détaillés sur votre audience',
      proFeature: 'Analytics complètes',
      businessFeature: 'Exports et API'
    }
  }

  const featureInfo = features[feature as keyof typeof features]
  if (!featureInfo) return null

  const planInfo = {
    pro: {
      price: '10€/mois',
      icon: Zap,
      color: 'blue'
    },
    business: {
      price: '19€/mois', 
      icon: Crown,
      color: 'purple'
    }
  }

  const plan = planInfo[requiredPlan]
  const Icon = plan.icon

  const handleUpgrade = () => {
    window.location.href = `/stripe/checkout/${requiredPlan}`
  }

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${className}`}>
        <Icon className={`h-4 w-4 text-${plan.color}-500`} />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Disponible avec {requiredPlan === 'pro' ? 'Pro' : 'Business'}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleUpgrade}
          className="h-6 px-2 text-xs"
        >
          Upgrade
        </Button>
      </div>
    )
  }

  return (
    <Card className={`border-dashed border-2 border-gray-300 dark:border-gray-600 ${className}`}>
      <CardContent className="p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className={`p-3 rounded-full bg-${plan.color}-100 dark:bg-${plan.color}-900/30`}>
            <Icon className={`h-6 w-6 text-${plan.color}-600 dark:text-${plan.color}-400`} />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {featureInfo.title}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
          {featureInfo.description}
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className={`border-${plan.color}-200 text-${plan.color}-700 dark:text-${plan.color}-300`}>
              {requiredPlan === 'pro' ? 'Pro' : 'Business'} - {plan.price}
            </Badge>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={handleUpgrade}
              className={`bg-${plan.color}-600 hover:bg-${plan.color}-700 text-white`}
            >
              Passer au {requiredPlan === 'pro' ? 'Pro' : 'Business'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.location.href = '/pricing'}
            >
              Comparer les plans
            </Button>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ✨ Inclut: {requiredPlan === 'pro' ? featureInfo.proFeature : featureInfo.businessFeature}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default FeatureUpgradePrompt
