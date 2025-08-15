import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Badge } from './ui/badge'
import { 
  AtSign, 
  Hash,
  ArrowRight,
  X
} from 'lucide-react'

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectPlatform: (platform: string) => void
}

const PLATFORMS = [
  {
    id: 'bluesky',
    name: 'Bluesky',
    description: 'Decentralized social network',
    icon: AtSign,
    color: 'bg-blue-500',
    available: true
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    description: 'Connect your Twitter/X account',
    icon: Hash,
    color: 'bg-black',
    available: true
  }
]

export default function AddAccountModal({ isOpen, onClose, onSelectPlatform }: AddAccountModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)

  const handlePlatformSelect = (platformId: string) => {
    setSelectedPlatform(platformId)
  }

  const handleContinue = () => {
    if (selectedPlatform) {
      onSelectPlatform(selectedPlatform)
      onClose()
    }
  }

  const handleClose = () => {
    setSelectedPlatform(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AtSign className="h-5 w-5" />
            Add Account
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose a platform to connect your account
          </p>

          <div className="space-y-3">
            {PLATFORMS.map((platform) => {
              const IconComponent = platform.icon
              return (
                <Card 
                  key={platform.id}
                  className={`cursor-pointer transition-all border-2 ${
                    selectedPlatform === platform.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  } ${
                    !platform.available ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => platform.available && handlePlatformSelect(platform.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${platform.color} text-white`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-medium">{platform.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {platform.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!platform.available && (
                          <Badge variant="secondary" className="text-xs">
                            Coming Soon
                          </Badge>
                        )}
                        {selectedPlatform === platform.id && (
                          <div className="h-4 w-4 rounded-full bg-primary border-2 border-white shadow-sm">
                            <div className="h-full w-full rounded-full bg-primary"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button 
              onClick={handleContinue} 
              disabled={!selectedPlatform}
              className="flex-1"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
