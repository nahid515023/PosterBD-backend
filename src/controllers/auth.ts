import { NextFunction, Request, Response } from 'express'
import { logInSchema, signUpSchema } from '../schema/users'
import { prisma } from '../index'
import { BadRequestException } from '../exception/bad-request'
import { ErrorCode } from '../exception/root'
import { hashSync, compareSync } from 'bcrypt'
import { NotFoundException } from '../exception/not-found'

import * as jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../secrets'

// Make sure JWT_SECRET is defined with a valid secret value
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined')
}

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logInSchema.parse(req.body)
  console.log(req.body)
  const { email, password, checked } = req.body
  const user = await prisma.user.findFirst({
    where: {
      email
    }
  })

  if (!user) {
    return next(
      new NotFoundException('User not found!', ErrorCode.USER_NOT_FOUND)
    )
  }

  if (!compareSync(password, user.password)) {
    return next(
      new BadRequestException(
        'Incorrect password!',
        ErrorCode.INCORRECT_PASSWORD
      )
    )
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET!, { expiresIn: '1d' })

  const maxAge = checked ? 24 * 3600 * 1000 * 30 : 24 * 3600 * 1000

  res
    .cookie('token', token, { httpOnly: false, maxAge })
    .json({
      message: 'Login successful!',
      user
    })
}

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  signUpSchema.parse(req.body)
  console.log(req.body)
  const { name, email, password, cPassword } = req.body
  let user = await prisma.user.findFirst({ where: { email } })
  if (user) {
    return next(
      new BadRequestException(
        'User already exists!',
        ErrorCode.USER_ALREADY_EXISTS
      )
    )
  }
  if (password !== cPassword) {
    return next(
      new BadRequestException(
        "Password don't match!",
        ErrorCode.PASSWORD_DO_NOT_MATCH
      )
    )
  }
  user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashSync(password, 10)
    }
  })
  res.json({ message: 'Created account!', user })
}
