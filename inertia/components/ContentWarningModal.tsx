import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/label'
import { X } from 'lucide-react'

interface ContentWarningModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (warnings: string[]) => void
  initialWarnings?: string[]
}

const CONTENT_WARNING_OPTIONS = [
  { id: 'suggestive', label: 'Suggestive', category: 'Adult Content' },
  { id: 'nudity', label: 'Nudity', category: 'Adult Content' },
  { id: 'adult', label: 'Adult', category: 'Adult Content' },
  { id: 'graphic-media', label: 'Graphic Media', category: 'Other' },
]

export default function ContentWarningModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialWarnings = [] 
}: ContentWarningModalProps) {
  const [selectedWarnings, setSelectedWarnings] = useState<string[]>(initialWarnings)

  useEffect(() => {
    setSelectedWarnings(initialWarnings)
  }, [initialWarnings])

  if (!isOpen) return null

  const handleWarningToggle = (warningId: string) => {
    setSelectedWarnings(prev => 
      prev.includes(warningId)
        ? prev.filter(id => id !== warningId)
        : [...prev, warningId]
    )
  }

  const handleSave = () => {
    onSave(selectedWarnings)
    onClose()
  }

  const adultContentOptions = CONTENT_WARNING_OPTIONS.filter(option => option.category === 'Adult Content')
  const otherOptions = CONTENT_WARNING_OPTIONS.filter(option => option.category === 'Other')

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-4 bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-white text-lg font-medium">
            Add a content warning
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-300">
            Please add any content warning labels that are applicable for the media you are posting.
          </p>

          {/* Adult Content Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white">Adult Content</h3>
            <div className="space-y-3">
              {adultContentOptions.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.id}
                    checked={selectedWarnings.includes(option.id)}
                    onCheckedChange={() => handleWarningToggle(option.id)}
                    className="border-gray-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label 
                    htmlFor={option.id} 
                    className="text-sm text-gray-200 cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Other Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white">Other</h3>
            <div className="space-y-3">
              {otherOptions.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.id}
                    checked={selectedWarnings.includes(option.id)}
                    onCheckedChange={() => handleWarningToggle(option.id)}
                    className="border-gray-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label 
                    htmlFor={option.id} 
                    className="text-sm text-gray-200 cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            >
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
