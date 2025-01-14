import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { createLogger } from '../services/logger'
import redis from '../services/cache'
import { UnauthorizedException } from '../exceptions/unauthorized'
import { ErrorCode } from '../exceptions/root'
import { JWT_SECRET } from '../secrets'
import { prisma } from '..'

const logger = createLogger('auth-middleware')

const CACHE_TTL = 3600 // 1 hour

interface JWTPayload {
  userId: string
  iat: number
  exp: number
}

// Extend Request interface to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {

  const token = req.cookies['token']
  logger.debug(`Extracted token: ${token}`)

  if (!token) {
    logger.warn('No token provided')
    return next(
      new UnauthorizedException('Access Denied', ErrorCode.UNAUTHORIZED)
    )
  }

  try {
    // Verify JWT token
    const payload = jwt.verify(token, JWT_SECRET!) as JWTPayload
    logger.debug(`JWT payload: ${JSON.stringify(payload)}`)

    // If user is already attached to the request and matches token userId, skip DB lookup
    if (req.user?.id !== payload.userId) {
      // Try to fetch user data from cache
      const cachedUser = await redis.get(`user:${payload.userId}`)
      if (cachedUser) {
        req.user = JSON.parse(cachedUser)
        logger.debug(`User data loaded from cache for userId: ${payload.userId}`)
        return next()
      }

      // If not in cache, fetch from DB
      const user = await prisma.user.findFirst({
        where: { id: payload.userId }
      })

      if (!user) {
        logger.error(`User not found: ${payload.userId}`)
        return next(
          new UnauthorizedException('Access Denied', ErrorCode.UNAUTHORIZED)
        )
      }

      // Cache user data
      await redis.set(
        `user:${payload.userId}`,
        JSON.stringify(user),
        'EX',
        CACHE_TTL
      )
      req.user = user
    }
    next()
  } catch (error) {
    logger.error('Token verification failed', error)
    return next(
      new UnauthorizedException('Invalid token', ErrorCode.UNAUTHORIZED)
    )
  }
}
