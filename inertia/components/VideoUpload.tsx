import React, { useState, useCallback } from 'react'
import { X, Video } from 'lucide-react'
import { Button } from './ui/button'

interface VideoUploadProps {
  selectedVideos: File[]
  onVideosChange: (videos: File[]) => void
  videoAltTexts: string[]
  onVideoAltTextsChange: (altTexts: string[]) => void
  maxVideos?: number
  disabled?: boolean
  onValidationError?: (message: string) => void
}

// Fonction pour valider la résolution vidéo
const validateVideoResolution = (file: File): Promise<{ width: number; height: number; duration: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    
    video.onloadedmetadata = () => {
      const width = video.videoWidth
      const height = video.videoHeight
      const duration = video.duration
      
      URL.revokeObjectURL(video.src)
      resolve({ width, height, duration })
    }
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Unable to read video metadata'))
    }
    
    video.src = URL.createObjectURL(file)
  })
}

export default function VideoUpload({
  selectedVideos,
  onVideosChange,
  videoAltTexts,
  onVideoAltTextsChange,
  maxVideos = 1,
  disabled = false,
  onValidationError
}: VideoUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [videoPreviews, setVideoPreviews] = useState<string[]>([])

  const handleVideoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    // Filtrer seulement les vidéos et respecter la limite
    const potentialVideos = files.filter(file => 
      file.type.startsWith('video/') && 
      file.size <= 50 * 1024 * 1024 // 50MB limit
    ).slice(0, maxVideos - selectedVideos.length)
    
    if (potentialVideos.length === 0) {
      if (files.some(file => file.size > 50 * 1024 * 1024)) {
        onValidationError?.('Video file is too large. Maximum size is 50MB.')
      }
      return
    }
    
    // Valider chaque vidéo
    const validatedVideos: File[] = []
    const newPreviews: string[] = []
    
    for (const file of potentialVideos) {
      try {
        const { width, height, duration } = await validateVideoResolution(file)
        
        // Vérifications selon les contraintes du service
        if (width > 1920 || height > 1080) {
          onValidationError?.(`Video resolution too high: ${width}x${height} (max: 1920x1080). Please resize your video.`)
          continue
        }
        
        if (duration > 60) {
          onValidationError?.(`Video too long: ${Math.round(duration)}s (max: 60s). Please trim your video.`)
          continue
        }
        
        // Si validation OK, ajouter à la liste
        validatedVideos.push(file)
        const url = URL.createObjectURL(file)
        newPreviews.push(url)
        
      } catch (error) {
        console.error('Error validating video:', error)
        onValidationError?.(`Unable to read video metadata for ${file.name}. Please try a different file.`)
      }
    }
    
    if (validatedVideos.length === 0) {
      // Reset input
      event.target.value = ''
      return
    }
    
    // Mettre à jour les états avec les vidéos validées
    const updatedVideos = [...selectedVideos, ...validatedVideos]
    const updatedPreviews = [...videoPreviews, ...newPreviews]
    const updatedAltTexts = [...videoAltTexts, ...new Array(validatedVideos.length).fill('')]
    
    onVideosChange(updatedVideos)
    setVideoPreviews(updatedPreviews)
    onVideoAltTextsChange(updatedAltTexts)
    
    // Reset input
    event.target.value = ''
  }, [selectedVideos, videoPreviews, videoAltTexts, maxVideos, onVideosChange, onVideoAltTextsChange, onValidationError])

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    
    const files = Array.from(event.dataTransfer.files)
    
    // Filtrer seulement les vidéos et respecter la limite
    const potentialVideos = files.filter(file => 
      file.type.startsWith('video/') && 
      file.size <= 50 * 1024 * 1024 // 50MB limit
    ).slice(0, maxVideos - selectedVideos.length)
    
    if (potentialVideos.length === 0) {
      if (files.some(file => file.size > 50 * 1024 * 1024)) {
        onValidationError?.('Video file is too large. Maximum size is 50MB.')
      }
      return
    }
    
    // Valider chaque vidéo (même logique que handleVideoUpload)
    const validatedVideos: File[] = []
    const newPreviews: string[] = []
    
    for (const file of potentialVideos) {
      try {
        const { width, height, duration } = await validateVideoResolution(file)
        
        if (width > 1920 || height > 1080) {
          onValidationError?.(`Video resolution too high: ${width}x${height} (max: 1920x1080). Please resize your video.`)
          continue
        }
        
        if (duration > 60) {
          onValidationError?.(`Video too long: ${Math.round(duration)}s (max: 60s). Please trim your video.`)
          continue
        }
        
        validatedVideos.push(file)
        const url = URL.createObjectURL(file)
        newPreviews.push(url)
        
      } catch (error) {
        console.error('Error validating video:', error)
        onValidationError?.(`Unable to read video metadata for ${file.name}. Please try a different file.`)
      }
    }
    
    if (validatedVideos.length === 0) return
    
    const updatedVideos = [...selectedVideos, ...validatedVideos]
    const updatedPreviews = [...videoPreviews, ...newPreviews]
    const updatedAltTexts = [...videoAltTexts, ...new Array(validatedVideos.length).fill('')]
    
    onVideosChange(updatedVideos)
    setVideoPreviews(updatedPreviews)
    onVideoAltTextsChange(updatedAltTexts)
  }, [selectedVideos, videoPreviews, videoAltTexts, maxVideos, onVideosChange, onVideoAltTextsChange, onValidationError])

  const removeVideo = useCallback((index: number) => {
    // Libérer l'URL de preview
    URL.revokeObjectURL(videoPreviews[index])
    
    const updatedVideos = selectedVideos.filter((_, i) => i !== index)
    const updatedPreviews = videoPreviews.filter((_, i) => i !== index)
    const updatedAltTexts = videoAltTexts.filter((_, i) => i !== index)
    
    onVideosChange(updatedVideos)
    setVideoPreviews(updatedPreviews)
    onVideoAltTextsChange(updatedAltTexts)
  }, [selectedVideos, videoPreviews, videoAltTexts, onVideosChange, onVideoAltTextsChange])

  const updateAltText = useCallback((index: number, altText: string) => {
    const updatedAltTexts = [...videoAltTexts]
    updatedAltTexts[index] = altText
    onVideoAltTextsChange(updatedAltTexts)
  }, [videoAltTexts, onVideoAltTextsChange])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {selectedVideos.length < maxVideos && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver 
              ? 'border-primary bg-primary/5' 
              : disabled 
                ? 'border-muted-foreground/25 bg-muted/50' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled) setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={handleVideoUpload}
            className="hidden"
            id="video-upload"
            disabled={disabled}
          />
          <label htmlFor="video-upload" className={`cursor-pointer ${disabled ? 'cursor-not-allowed' : ''}`}>
            <Video className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              MP4, MOV, WebM up to 50MB • Max 60 seconds
            </p>
            {maxVideos > 1 && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedVideos.length}/{maxVideos} videos selected
              </p>
            )}
          </label>
        </div>
      )}

      {/* Video Previews */}
      {selectedVideos.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Selected Videos</h4>
          <div className="grid gap-4">
            {selectedVideos.map((video, index) => (
              <div key={index} className="relative border rounded-lg p-4 space-y-3">
                {/* Video Preview */}
                <div className="relative">
                  <video
                    src={videoPreviews[index]}
                    className="w-full h-32 object-cover rounded bg-muted"
                    controls
                    muted
                  />
                  
                  {/* Remove Button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => removeVideo(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Video Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium truncate max-w-[60%]">
                      {video.name}
                    </span>
                    <span>{formatFileSize(video.size)}</span>
                  </div>
                  
                  {/* Alt Text Input */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Description (for accessibility)
                    </label>
                    <input
                      type="text"
                      placeholder="Describe this video for screen readers..."
                      value={videoAltTexts[index] || ''}
                      onChange={(e) => updateAltText(index, e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-border rounded focus:ring-1 focus:ring-ring focus:border-ring"
                      maxLength={200}
                    />
                    <div className="text-xs text-muted-foreground mt-1 text-right">
                      {(videoAltTexts[index] || '').length}/200
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info/Limits */}
      {selectedVideos.length === 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span>Supported formats:</span>
            <span>MP4, MOV, WebM</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Max file size:</span>
            <span>50MB</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Max duration:</span>
            <span>60 seconds</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Max videos:</span>
            <span>{maxVideos} per post</span>
          </div>
        </div>
      )}
    </div>
  )
}
