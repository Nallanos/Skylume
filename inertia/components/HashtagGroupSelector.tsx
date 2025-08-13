import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Hash, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface HashtagGroup {
  id: number
  name: string
  hashtags: string[]
}

interface Props {
  onInsert: (hashtags: string[]) => void
  className?: string
}

function HashtagGroupSelector({ onInsert, className }: Props) {
  const [groups, setGroups] = useState<HashtagGroup[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/hashtag-groups')
      if (response.ok) {
        const data = await response.json()
        setGroups(data)
      }
    } catch (error) {
      console.error('Failed to fetch hashtag groups:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchGroups()
    }
  }, [isOpen])

  const handleInsertGroup = (group: HashtagGroup) => {
    // Ajouter # devant chaque hashtag
    const formattedHashtags = group.hashtags.map(tag => `#${tag}`)
    onInsert(formattedHashtags)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          type="button"
        >
          <Hash className="h-4 w-4 mr-2" />
          Insert Hashtag Group
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert Hashtag Group</DialogTitle>
          <DialogDescription>
            Select a hashtag group to insert into your post.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8">
              <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hashtag groups found.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create some groups to use them in your posts.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <Card 
                key={group.id} 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleInsertGroup(group)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Hash className="h-4 w-4 text-blue-500" />
                    {group.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {group.hashtags.slice(0, 5).map((hashtag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        #{hashtag}
                      </Badge>
                    ))}
                    {group.hashtags.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{group.hashtags.length - 5} more
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {group.hashtags.length} hashtags
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Click on a group to insert its hashtags
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default HashtagGroupSelector
