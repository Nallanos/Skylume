import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import type { OversizedImage } from '../../types/schedule'
import { formatFileSize } from '../../utils/schedule/mediaValidation'

interface ImageCompressionModalProps {
  isOpen: boolean
  oversizedImages: OversizedImage[]
  onCompress: () => void
  onCancel: () => void
  isCompressing: boolean
}

export const ImageCompressionModal = ({
  isOpen,
  oversizedImages,
  onCompress,
  onCancel,
  isCompressing
}: ImageCompressionModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Images Too Large
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-3">
              The following images exceed Bluesky's maximum size limit of <strong>976KB</strong>:
            </p>
            <ul className="space-y-2">
              {oversizedImages.map(({ file }, index) => (
                <li key={index} className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-orange-700 dark:text-orange-400 font-medium ml-2">
                    {formatFileSize(file.size)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>We can automatically compress these images</strong> to meet Bluesky's requirements while maintaining good quality.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={onCompress}
              disabled={isCompressing}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:text-white transition-colors"
            >
              {isCompressing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Compressing...
                </>
              ) : (
                'Compress Images'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isCompressing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
