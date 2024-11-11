import { ErrorCode, HttpException } from './root'

export class UnauthorizedException extends HttpException {
  constructor (message: string, errorCode: ErrorCode) {
    super(message, errorCode, 404, null)
  }
}