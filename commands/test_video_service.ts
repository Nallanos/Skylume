import { BaseCommand } from '@adonisjs/ace'
import VideoProcessingService from '#services/video_processing_service'

export default class TestVideoService extends BaseCommand {
  static commandName = 'test:video'
  static description = 'Test the video processing service'

  async run() {
    console.log('🎬 Testing Video Processing Service...')

    try {
      // Vérifier que FFmpeg est installé
      console.log('1. Checking FFmpeg installation...')
      const ffmpegAvailable = await VideoProcessingService.checkFFmpegInstallation()
      console.log(`   FFmpeg available: ${ffmpegAvailable}`)
      
      if (!ffmpegAvailable) {
        console.error('❌ FFmpeg not found. Please install FFmpeg.')
        return
      }
      
      // Tester la validation d'une vidéo
      console.log('2. Testing video validation...')
      const testVideoPath = 'public/uploads/test_video.mp4'
      const validation = await VideoProcessingService.validateVideo(testVideoPath)
      console.log(`   Valid: ${validation.valid}`)
      if (!validation.valid) {
        console.log(`   Errors: ${validation.errors.join(', ')}`)
      }
      
      // Tester l'extraction de métadonnées
      console.log('3. Testing metadata extraction...')
      const metadata = await VideoProcessingService.extractMetadata(testVideoPath)
      console.log(`   Duration: ${metadata.duration}s`)
      console.log(`   Dimensions: ${metadata.width}x${metadata.height}`)
      console.log(`   Size: ${(metadata.size / (1024 * 1024)).toFixed(2)}MB`)
      console.log(`   Format: ${metadata.format}`)
      console.log(`   Codec: ${metadata.codec}`)
      
      // Tester la génération de thumbnail
      console.log('4. Testing thumbnail generation...')
      const thumbnailPath = 'public/uploads/schedules/thumbnails/test_thumbnail.jpg'
      await VideoProcessingService.generateThumbnail(testVideoPath, thumbnailPath, 1.5)
      console.log(`   Thumbnail saved: ${thumbnailPath}`)
      
      // Tester le traitement complet
      console.log('5. Testing complete video processing...')
      const processedVideo = await VideoProcessingService.processVideo(testVideoPath, 'test_user')
      console.log(`   Video path: ${processedVideo.path}`)
      console.log(`   Thumbnail path: ${processedVideo.thumbnailPath}`)
      console.log(`   Metadata: ${JSON.stringify(processedVideo.metadata, null, 2)}`)
      
      console.log('✅ All tests passed!')
      
    } catch (error) {
      console.error('❌ Test failed:', error)
    }
  }
}
