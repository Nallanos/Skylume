import { useState, useCallback } from 'react'
import type { OversizedImage } from '../../types/schedule'

export const useImageCompression = () => {
  const [showCompressionModal, setShowCompressionModal] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)

  const compressImage = useCallback(async (file: File, maxSizeKB: number = 976): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        let { width, height } = img
        const maxDimension = 1920

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width
            width = maxDimension
          } else {
            width = (width * maxDimension) / height
            height = maxDimension
          }
        }

        canvas.width = width
        canvas.height = height

        ctx?.drawImage(img, 0, 0, width, height)

        let quality = 0.9
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }

            if (blob.size <= maxSizeKB * 1024 || quality <= 0.1) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              quality -= 0.1
              tryCompress()
            }
          }, 'image/jpeg', quality)
        }

        tryCompress()
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }, [])

  const handleCompressOversizedImages = useCallback(async (
    oversizedImages: OversizedImage[],
    onSuccess: (compressedFiles: File[], compressedPreviews: string[]) => void
  ) => {
    setIsCompressing(true)

    try {
      const compressedFiles: File[] = []
      const compressedPreviews: string[] = []

      for (const { file } of oversizedImages) {
        const compressedFile = await compressImage(file)
        compressedFiles.push(compressedFile)

        const preview = URL.createObjectURL(compressedFile)
        compressedPreviews.push(preview)
      }

      onSuccess(compressedFiles, compressedPreviews)
      setShowCompressionModal(false)
    } catch (error) {
      console.error('Compression failed:', error)
      alert('Failed to compress some images. Please try again or manually reduce file sizes.')
    } finally {
      setIsCompressing(false)
    }
  }, [compressImage])

  return {
    showCompressionModal,
    setShowCompressionModal,
    isCompressing,
    compressImage,
    handleCompressOversizedImages,
  }
}
