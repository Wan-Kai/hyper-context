import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const response = exception.getResponse() as any
      const message = response?.message ?? exception.message
      return res.status(status).json({ message })
    }

    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

