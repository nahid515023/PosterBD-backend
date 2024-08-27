import { NextFunction, Request, Response } from 'express'
import { UnauthorizedException } from '../exception/unauthorized'
import { ErrorCode } from '../exception/root'
import * as jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../secrets'
import { prisma } from '..'

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.token

  if (!token) {
    return next(
      new UnauthorizedException('Access Denied', ErrorCode.UNAUTHORIZED)
    )
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET!) as {
      userId: string
      iat: number
      exp: number
    }

    if (req.user?.id !== payload.userId) {
      const user = await prisma.user.findFirst({
        where: {
          id: payload.userId
        }
      })
      if (!user) {
        return next(
          new UnauthorizedException('Access Denied', ErrorCode.UNAUTHORIZED)
        )
      }
      req.user = user
    }
    
    next()

  } catch (err) {
    return next(
      new UnauthorizedException('Access Denied', ErrorCode.UNAUTHORIZED)
    )
  }
}
