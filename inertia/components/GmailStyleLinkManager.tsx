import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog'
import { Link as LinkIcon } from 'lucide-react'

interface GmailStyleLinkManagerProps {
  onLinkInsert: (text: string, url: string) => void
  disabled?: boolean
}

export default function GmailStyleLinkManager({ onLinkInsert, disabled = false }: GmailStyleLinkManagerProps) {
  const [showModal, setShowModal] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [errors, setErrors] = useState<{ text?: string; url?: string }>({})

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleInsertLink = () => {
    const newErrors: { text?: string; url?: string } = {}

    if (!linkText.trim()) {
      newErrors.text = 'Link text is required'
    }

    if (!linkUrl.trim()) {
      newErrors.url = 'URL is required'
    } else if (!validateUrl(linkUrl)) {
      newErrors.url = 'Please enter a valid URL'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Insérer le lien dans le textarea
    onLinkInsert(linkText.trim(), linkUrl.trim())
    
    // Reset et fermer
    setLinkText('')
    setLinkUrl('')
    setErrors({})
    setShowModal(false)
  }

  const resetModal = () => {
    setLinkText('')
    setLinkUrl('')
    setErrors({})
  }

  return (
    <div className="inline-block">
      <Dialog open={showModal} onOpenChange={(open) => {
        setShowModal(open)
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
            <LinkIcon className="h-4 w-4" />
            Add Link
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Insert Link
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="linkText">Display text</Label>
              <Input
                id="linkText"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="e.g., our website, click here"
                className="mt-1"
                autoFocus
              />
              {errors.text && (
                <p className="text-sm text-red-500 mt-1">{errors.text}</p>
              )}
            </div>
            <div>
              <Label htmlFor="linkUrl">Link URL</Label>
              <Input
                id="linkUrl"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="mt-1"
              />
              {errors.url && (
                <p className="text-sm text-red-500 mt-1">{errors.url}</p>
              )}
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 <strong>Smart Links:</strong> The text &quot;{linkText || 'Display text'}&quot; will be inserted at your cursor position and will become a clickable link to {linkUrl || 'URL'} on Bluesky.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleInsertLink}
            >
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
