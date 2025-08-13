import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

interface VideoMetadata {
  duration: number
  width: number
  height: number
  size: number
  format: string
  codec: string
  bitrate?: number
}

interface ProcessedVideo {
  path: string
  thumbnailPath: string
  metadata: VideoMetadata
}

export default class VideoProcessingService {
  private static readonly SUPPORTED_FORMATS = ['mp4', 'mov', 'webm']
  private static readonly MAX_SIZE_MB = 50
  private static readonly MAX_DURATION_SECONDS = 60
  private static readonly MAX_WIDTH = 1920
  private static readonly MAX_HEIGHT = 1080

  /**
   * Valider un fichier vidéo
   */
  public static async validateVideo(filePath: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    try {
      // Vérifier l'existence du fichier
      if (!fs.existsSync(filePath)) {
        errors.push('Video file does not exist')
        return { valid: false, errors }
      }

      // Vérifier la taille du fichier
      const stats = fs.statSync(filePath)
      const sizeMB = stats.size / (1024 * 1024)
      if (sizeMB > this.MAX_SIZE_MB) {
        errors.push(`Video file is too large: ${sizeMB.toFixed(1)}MB (max: ${this.MAX_SIZE_MB}MB)`)
      }

      // Vérifier l'extension
      const ext = path.extname(filePath).toLowerCase().substring(1)
      if (!this.SUPPORTED_FORMATS.includes(ext)) {
        errors.push(`Unsupported video format: ${ext} (supported: ${this.SUPPORTED_FORMATS.join(', ')})`)
      }

      // Obtenir les métadonnées
      const metadata = await this.extractMetadata(filePath)
      
      // Vérifier la durée
      if (metadata.duration > this.MAX_DURATION_SECONDS) {
        errors.push(`Video is too long: ${metadata.duration}s (max: ${this.MAX_DURATION_SECONDS}s)`)
      }

      // Vérifier les dimensions
      if (metadata.width > this.MAX_WIDTH || metadata.height > this.MAX_HEIGHT) {
        errors.push(`Video resolution too high: ${metadata.width}x${metadata.height} (max: ${this.MAX_WIDTH}x${this.MAX_HEIGHT})`)
      }

      return { valid: errors.length === 0, errors }
    } catch (error) {
      console.error('[VIDEO] Error validating video:', error)
      errors.push('Error reading video file')
      return { valid: false, errors }
    }
  }

  /**
   * Extraire les métadonnées d'une vidéo avec FFprobe
   */
  public static async extractMetadata(filePath: string): Promise<VideoMetadata> {
    try {
      const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
      const { stdout } = await execAsync(command)
      const data = JSON.parse(stdout)

      const videoStream = data.streams.find((stream: any) => stream.codec_type === 'video')
      if (!videoStream) {
        throw new Error('No video stream found')
      }

      const stats = fs.statSync(filePath)

      return {
        duration: parseFloat(data.format.duration) || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        size: stats.size,
        format: data.format.format_name || 'unknown',
        codec: videoStream.codec_name || 'unknown',
        bitrate: parseInt(data.format.bit_rate) || undefined
      }
    } catch (error) {
      console.error('[VIDEO] Error extracting metadata:', error)
      throw new Error('Failed to extract video metadata')
    }
  }

  /**
   * Générer un thumbnail à partir d'une vidéo
   */
  public static async generateThumbnail(
    videoPath: string,
    outputPath: string,
    timeSeconds: number = 2
  ): Promise<string> {
    try {
      // Créer le dossier de sortie s'il n'existe pas
      const outputDir = path.dirname(outputPath)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      // Générer le thumbnail avec FFmpeg
      const command = `ffmpeg -i "${videoPath}" -ss ${timeSeconds} -vframes 1 -q:v 2 -y "${outputPath}"`
      await execAsync(command)

      if (!fs.existsSync(outputPath)) {
        throw new Error('Thumbnail generation failed')
      }

      console.log(`[VIDEO] Generated thumbnail: ${outputPath}`)
      return outputPath
    } catch (error) {
      console.error('[VIDEO] Error generating thumbnail:', error)
      throw new Error('Failed to generate video thumbnail')
    }
  }

  /**
   * Traiter une vidéo complètement (validation + thumbnail + métadonnées)
   */
  public static async processVideo(
    videoPath: string,
    userId: string
  ): Promise<ProcessedVideo> {
    try {
      console.log(`[VIDEO] Processing video: ${videoPath}`)

      // Valider la vidéo
      const validation = await this.validateVideo(videoPath)
      if (!validation.valid) {
        throw new Error(`Video validation failed: ${validation.errors.join(', ')}`)
      }

      // Extraire les métadonnées
      const metadata = await this.extractMetadata(videoPath)

      // Générer le thumbnail
      const fileName = path.basename(videoPath, path.extname(videoPath))
      const thumbnailPath = path.join(
        'public/uploads/schedules/thumbnails',
        `${userId}_${Date.now()}_${fileName}.jpg`
      )
      await this.generateThumbnail(videoPath, thumbnailPath)

      // Retourner les chemins relatifs pour la base de données
      const relativeVideoPath = videoPath.replace('public', '')
      const relativeThumbnailPath = thumbnailPath.replace('public', '')

      console.log(`[VIDEO] Video processed successfully:`, {
        video: relativeVideoPath,
        thumbnail: relativeThumbnailPath,
        duration: metadata.duration,
        size: `${(metadata.size / (1024 * 1024)).toFixed(1)}MB`
      })

      return {
        path: relativeVideoPath,
        thumbnailPath: relativeThumbnailPath,
        metadata
      }
    } catch (error) {
      console.error('[VIDEO] Error processing video:', error)
      throw error
    }
  }

  /**
   * Nettoyer les fichiers temporaires
   */
  public static async cleanup(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
          console.log(`[VIDEO] Cleaned up file: ${filePath}`)
        }
      } catch (error) {
        console.error(`[VIDEO] Error cleaning up file ${filePath}:`, error)
      }
    }
  }

  /**
   * Vérifier si FFmpeg est installé
   */
  public static async checkFFmpegInstallation(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version')
      await execAsync('ffprobe -version')
      return true
    } catch (error) {
      console.error('[VIDEO] FFmpeg not found. Please install FFmpeg to enable video processing.')
      return false
    }
  }
}
