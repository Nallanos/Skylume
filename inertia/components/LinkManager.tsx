import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog'
import { X, Link as LinkIcon, Plus } from 'lucide-react'

interface ExplicitLink {
  text: string
  url: string
}

interface LinkManagerProps {
  links: ExplicitLink[]
  onLinksChange: (links: ExplicitLink[]) => void
  disabled?: boolean
}

export default function LinkManager({ links, onLinksChange, disabled = false }: LinkManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newLinkText, setNewLinkText] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [errors, setErrors] = useState<{ text?: string; url?: string }>({})

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleAddLink = () => {
    const newErrors: { text?: string; url?: string } = {}

    if (!newLinkText.trim()) {
      newErrors.text = 'Link text is required'
    }

    if (!newLinkUrl.trim()) {
      newErrors.url = 'URL is required'
    } else if (!validateUrl(newLinkUrl)) {
      newErrors.url = 'Please enter a valid URL'
    }

    // Check if text already exists
    if (links.some(link => link.text === newLinkText.trim())) {
      newErrors.text = 'This text is already used for another link'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const newLink: ExplicitLink = {
      text: newLinkText.trim(),
      url: newLinkUrl.trim()
    }

    onLinksChange([...links, newLink])
    setNewLinkText('')
    setNewLinkUrl('')
    setErrors({})
    setShowAddModal(false)
  }

  const handleRemoveLink = (index: number) => {
    const updatedLinks = links.filter((_, i) => i !== index)
    onLinksChange(updatedLinks)
  }

  const resetModal = () => {
    setNewLinkText('')
    setNewLinkUrl('')
    setErrors({})
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Rich Text Links</Label>
        <Dialog open={showAddModal} onOpenChange={(open) => {
          setShowAddModal(open)
          if (!open) resetModal()
        }}>
          <DialogTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Add Rich Text Link
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="linkText">Text to make clickable</Label>
                <Input
                  id="linkText"
                  value={newLinkText}
                  onChange={(e) => setNewLinkText(e.target.value)}
                  placeholder="e.g., our website"
                  className="mt-1"
                />
                {errors.text && (
                  <p className="text-sm text-red-500 mt-1">{errors.text}</p>
                )}
              </div>
              <div>
                <Label htmlFor="linkUrl">URL destination</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="mt-1"
                />
                {errors.url && (
                  <p className="text-sm text-red-500 mt-1">{errors.url}</p>
                )}
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Preview:</strong> &quot;{newLinkText || 'Text'}&quot; will become a clickable link to {newLinkUrl || 'URL'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddLink}
              >
                Add Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {links.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Configured Links ({links.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {links.map((link, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="font-medium text-sm truncate">
                        &quot;{link.text}&quot;
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      → {link.url}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveLink(index)}
                    disabled={disabled}
                    className="ml-2 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {links.length === 0 && (
        <div className="text-center p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <LinkIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No rich text links configured
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Links will be clickable on Bluesky (not available for Twitter)
          </p>
        </div>
      )}
    </div>
  )
}
