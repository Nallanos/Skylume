import { useState, useCallback, useEffect, useRef } from 'react'
import type { OversizedImage } from '../../types/schedule'
import { 
  validateVideoFile, 
  MAX_IMAGE_SIZE, 
  MAX_IMAGES_COUNT, 
  MAX_VIDEOS_COUNT 
} from '../../utils/schedule/mediaValidation'

export const useMediaUpload = (isTwitterSelected: boolean) => {
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageAltTexts, setImageAltTexts] = useState<string[]>([])
  const [selectedVideos, setSelectedVideos] = useState<File[]>([])
  const [videoAltTexts, setVideoAltTexts] = useState<string[]>([])
  const [contentWarnings, setContentWarnings] = useState<string[]>([])
  const [videoValidationError, setVideoValidationError] = useState<string>('')
  const [oversizedImages, setOversizedImages] = useState<OversizedImage[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isTwitterSelected && (selectedImages.length > 0 || selectedVideos.length > 0)) {
      console.log('[MEDIA] Twitter selected, clearing media files')
      clearAllMedia()
    }
  }, [isTwitterSelected])

  useEffect(() => {
    if (videoValidationError) {
      const timer = setTimeout(() => {
        setVideoValidationError('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [videoValidationError])

  const handleMediaSelect = useCallback(async (files: FileList | null) => {
    if (!files) return

    const imageFiles: File[] = []
    const videoFiles: File[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith('image/')) {
        imageFiles.push(file)
      } else if (file.type.startsWith('video/')) {
        videoFiles.push(file)
      }
    }

    if (selectedImages.length + imageFiles.length > MAX_IMAGES_COUNT) {
      alert(`You can only upload up to ${MAX_IMAGES_COUNT} images total`)
      return
    }

    if (selectedVideos.length + videoFiles.length > MAX_VIDEOS_COUNT) {
      alert(`You can only upload ${MAX_VIDEOS_COUNT} video`)
      return
    }

    if ((selectedImages.length > 0 || imageFiles.length > 0) && (selectedVideos.length > 0 || videoFiles.length > 0)) {
      alert('You cannot mix images and videos in the same post')
      return
    }

    const maxImageSize = MAX_IMAGE_SIZE
    const validImages: File[] = []
    const oversized: OversizedImage[] = []

    imageFiles.forEach((imageFile, index) => {
      if (imageFile.size > maxImageSize) {
        oversized.push({ file: imageFile, index })
      } else {
        validImages.push(imageFile)
      }
    })

    if (oversized.length > 0) {
      setOversizedImages(oversized)
    }

    if (validImages.length > 0) {
      const newPreviews: string[] = []
      const newAltTexts: string[] = []

      validImages.forEach((file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          newPreviews.push(e.target?.result as string)
          if (newPreviews.length === validImages.length) {
            setImagePreviews((prev) => [...prev, ...newPreviews])
          }
        }
        reader.readAsDataURL(file)
        newAltTexts.push('')
      })

      setSelectedImages((prev) => [...prev, ...validImages])
      setImageAltTexts((prev) => [...prev, ...newAltTexts])
    }

    for (const videoFile of videoFiles) {
      const error = await validateVideoFile(videoFile)
      if (error) {
        setVideoValidationError(error)
        return
      }
    }

    setVideoValidationError('')

    if (videoFiles.length > 0) {
      const newVideoAltTexts: string[] = videoFiles.map(() => '')
      setSelectedVideos((prev) => [...prev, ...videoFiles])
      setVideoAltTexts((prev) => [...prev, ...newVideoAltTexts])
    }
  }, [selectedImages.length, selectedVideos.length])

  const removeImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
    setImageAltTexts((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const removeVideo = useCallback((index: number) => {
    setSelectedVideos((prev) => prev.filter((_, i) => i !== index))
    setVideoAltTexts((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearImages = useCallback(() => {
    setSelectedImages([])
    setImagePreviews([])
    setImageAltTexts([])
  }, [])

  const clearVideos = useCallback(() => {
    setSelectedVideos([])
    setVideoAltTexts([])
  }, [])

  const clearAllMedia = useCallback(() => {
    clearImages()
    clearVideos()
    setContentWarnings([])
    setVideoValidationError('')
  }, [clearImages, clearVideos])

  const updateAltText = useCallback((index: number, altText: string) => {
    setImageAltTexts((prev) => {
      const newAltTexts = [...prev]
      newAltTexts[index] = altText
      return newAltTexts
    })
  }, [])

  const updateVideoAltText = useCallback((index: number, altText: string) => {
    setVideoAltTexts((prev) => {
      const newAltTexts = [...prev]
      newAltTexts[index] = altText
      return newAltTexts
    })
  }, [])

  const resetMedia = useCallback(() => {
    setSelectedImages([])
    setImagePreviews([])
    setImageAltTexts([])
    setSelectedVideos([])
    setVideoAltTexts([])
    setContentWarnings([])
    setVideoValidationError('')
    setOversizedImages([])
  }, [])

  return {
    selectedImages,
    setSelectedImages,
    imagePreviews,
    setImagePreviews,
    imageAltTexts,
    setImageAltTexts,
    selectedVideos,
    setSelectedVideos,
    videoAltTexts,
    setVideoAltTexts,
    contentWarnings,
    setContentWarnings,
    videoValidationError,
    setVideoValidationError,
    oversizedImages,
    setOversizedImages,
    fileInputRef,
    handleMediaSelect,
    removeImage,
    removeVideo,
    clearImages,
    clearVideos,
    clearAllMedia,
    updateAltText,
    updateVideoAltText,
    resetMedia,
  }
}
