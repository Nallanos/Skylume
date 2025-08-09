import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Status pages are used to display a custom HTML pages for certain error
   * codes. You might want to enable them in production only, but feel
   * free to enable them in development as well.
   */
  protected renderStatusPages = app.inProduction

  /**
   * Status pages is a collection of error code range and a callback
   * to return the HTML contents to send as a response.
   */
  protected statusPages: Record<StatusPageRange, StatusPageRenderer> = {
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    const { request, response, logger } = ctx

    // Handle JSON parsing errors specifically for Python endpoints
    if (request.url().includes('/internal/python') && error instanceof Error) {
      // Check for JSON parsing errors
      if (error.message.includes('Unexpected token') ||
        error.message.includes('JSON') ||
        error.message.includes('parse')) {

        logger.error('JSON parsing error on Python endpoint:', {
          error: error.message,
          stack: error.stack,
          url: request.url(),
          method: request.method(),
          contentType: request.header('content-type'),
          contentLength: request.header('content-length'),
          bodyPreview: request.raw()?.substring(0, 500)
        })

        return response.status(400).json({
          status: 'error',
          message: 'Invalid JSON format in request body',
          details: 'The request body could not be parsed as valid JSON',
          error_type: 'json_parse_error'
        })
      }
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
