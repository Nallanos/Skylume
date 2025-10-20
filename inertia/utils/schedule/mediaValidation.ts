export const MAX_IMAGE_SIZE = 976 * 1024
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024
export const MAX_IMAGES_COUNT = 4
export const MAX_VIDEOS_COUNT = 1
export const MAX_VIDEO_DURATION = 60
export const MAX_VIDEO_WIDTH = 1920
export const MAX_VIDEO_HEIGHT = 1080

export const validateVideoFile = async (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      const duration = video.duration
      const { videoWidth, videoHeight } = video

      if (duration > MAX_VIDEO_DURATION) {
        resolve('Video duration must be 60 seconds or less')
        return
      }

      if (videoWidth > MAX_VIDEO_WIDTH || videoHeight > MAX_VIDEO_HEIGHT) {
        resolve('Video resolution must be 1920x1080 or lower')
        return
      }

      resolve(null)
    }

    video.onerror = () => {
      resolve('Invalid video file')
    }

    video.src = URL.createObjectURL(file)
  })
}

export const validateImageSize = (file: File): boolean => {
  return file.size <= MAX_IMAGE_SIZE
}

export const isImageOversized = (file: File): boolean => {
  return file.size > MAX_IMAGE_SIZE
}

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
