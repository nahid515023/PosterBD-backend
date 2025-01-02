import e, { NextFunction, Request, Response } from 'express'
import { logInSchema, signUpSchema } from '../schema/users'
import { prisma } from '../index'
import { BadRequestException } from '../exceptions/bad-request'
import { ErrorCode } from '../exceptions/root'
import { hashSync, compareSync } from 'bcrypt'
import { NotFoundException } from '../exceptions/not-found'

import * as jwt from 'jsonwebtoken'
import { JWT_SECRET, PORT } from '../secrets'

import { createLogger } from '../services/logger'
import { sanitizeInput } from '../utils/sanitizer'
import EmailService from '../services/email'
import { Role } from '@prisma/client'

const logger = createLogger('auth-controller')

// Login function
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('Login request:', req.body)
    logger.info('Processing login request', { email: req.body.email })
    try {
      logInSchema.parse(req.body)
    } catch (error) {
      logger.warn('Login failed - invalid input', { error })
      console.log(error)
      return next(
        new BadRequestException(
          'Password must contain at least 8 character!',
          ErrorCode.INVALID_INPUT
        )
      )
    }
    const { email, password,role } = req.body

    const user = await prisma.user.findFirst({
      where: { email,role }
    })

    if (!user) {
      logger.warn('Login failed - user not found', { email })
      return next(
        new BadRequestException('User not found!', ErrorCode.USER_NOT_FOUND)
      )
    }

    if (!user.verified) {
      logger.warn('Login failed - user not verified', { email })
      return next(
        new BadRequestException(
          'User not verified!',
          ErrorCode.USER_NOT_VERIFIED
        )
      )
    }

    if (!compareSync(password, user.password)) {
      logger.warn('Login failed - incorrect password', { email })
      return next(
        new BadRequestException(
          'Incorrect password!',
          ErrorCode.INCORRECT_PASSWORD
        )
      )
    }

    logger.debug('Generating JWT token', { userId: user.id })
    const token = jwt.sign({ userId: user.id }, JWT_SECRET!, {
      expiresIn: '1d'
    })
    const maxAge = 24 * 3600 * 1000

    logger.info('Login successful', { userId: user.id })
    res
      .cookie('token', token, { httpOnly: false, maxAge })
      .cookie('user', user, { httpOnly: false, maxAge })
      .json({
        message: 'Login successful!'
      })
  } catch (error) {
    logger.error('Login error', { error })
    next(error)
  }
}

// Signup function
export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Processing signup request')
    console.log(req.body)

    // Validate input
    const validatedData = signUpSchema.parse(req.body)

    // Sanitize inputs
    const { name, email, password,role } = sanitizeInput(validatedData)

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), role: role }
    })

    if (existingUser) {
      logger.warn(`Signup attempt with existing email: ${email}`)
      throw new BadRequestException(
        'User already exists!',
        ErrorCode.USER_ALREADY_EXISTS
      )
    }

    // Validate password match
    // if (password !== cPassword) {
    //   throw new BadRequestException(
    //     "Passwords don't match!",
    //     ErrorCode.PASSWORD_DO_NOT_MATCH
    //   )
    // }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashSync(password, 12),
        role: role,
        dob: '1/1/2001',
        gender: 'Not specified',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    logger.info(`User created successfully: ${user.id}`)

    // Create token
    const emailToken = Math.floor(
      (100000 + Math.random() * 900000) % 10000
    ).toString()
    // Store token in db
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: emailToken
      }
    })

    // Send verification email

    EmailService.sendEmail(
      user.email,
      'Verify your email address',
      `Your verification code is: ${emailToken}`,
      `<p>Your verification code is: <strong>${emailToken}</strong></p>`
    )

    logger.info(`Verification email sent to: ${user.email}`)

    // Send success response
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      },
      token: emailToken
    })
  } catch (error) {
    logger.error('Signup error:', error)
    next(error)
  }
}

// Logout function
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Processing logout request')

    // Clear cookies
    res.clearCookie('token')
    res.clearCookie('user')

    logger.info('Logout successful')
    res.json({
      message: 'Logout successful!'
    })
  } catch (error) {
    logger.error('Logout error:', error)
    next(error)
  }
}

// verify function
export const emailVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Processing email verification request')
    console.log(req.body);

    const { token } = req.body

    const emailVerification = await prisma.emailVerification.findFirst({
      where: { token }
    })

    if (!emailVerification) {
      logger.warn('Email verification failed - invalid token')
      return next(
        new BadRequestException(
          'Invalid verification token!',
          ErrorCode.INVALID_VERIFICATION_TOKEN
        )
      )
    }

    // Update user verified status
    const user = await prisma.user.update({
      where: { id: emailVerification.userId },
      data: { verified: true }
    })

    // Delete verification token
    await prisma.emailVerification.delete({
      where: { id: emailVerification.id }
    })
    logger.info('Email verified successfully')

    // Generate JWT token

    logger.debug('Generating JWT token', { userId: user.id })

    const jwt_token = jwt.sign({ userId: user.id }, JWT_SECRET!, {
      expiresIn: '1d'
    })
    const maxAge = 24 * 3600 * 1000

    logger.info('Login successful', { userId: user.id })

    // Send
    res
      .cookie('token', jwt_token, { httpOnly: false, maxAge })
      .cookie('user', user, { httpOnly: false, maxAge })
      .json({
        message: 'Email verified successfully!',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          }
        }
      })
  } catch (error) {
    logger.error('Email verification error:', error)
    next(error)
  }
}

//forgot password

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Processing forgot password request', { email: req.body.email,Role: req.body.role })
    const { email,role } = req.body

    const user = await prisma.user.findFirst({
      where: { email,role }
    })

    if (!user) {
      logger.warn('Forgot password failed - user not found', { email },{role})
      return next(
        new NotFoundException('User not found!', ErrorCode.USER_NOT_FOUND)
      )
    }

    // Create token
    const ResetToken = Math.floor(
      (100000 + Math.random() * 900000) % 1000000
    ).toString()
    // Store token in db
    await prisma.restPassword.create({
      data: {
        userId: user.id,
        token: ResetToken
      }
    })

    // Create link for password reset
    const link = `http://localhost:${3000}/forgot-password/${ResetToken}/${user.id}`

    // Send reset password email
    EmailService.sendEmail(
      user.email,
      'Reset your password',
      `Click on the link to reset your password: ${link}`,
      `<p>Click on the link to reset your password: <a href="${link}">${link}</a></p>`
    )

    logger.info(`Password reset email sent to: ${user.email}`)

    // Send success response
    res.json({
      success: true,
      message: 'A password reset link has been sent to your email address. Please check your inbox and follow the instructions to reset your password.'
    })
  } catch (error) {
    logger.error('Forgot password error', { error })
    next(error)
  }
}

//reset password

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Processing reset password request', { ResetToken: req.params.ResetToken, userId: req.params.userId })
    const { ResetToken, userId } = req.params
    const { password } = req.body
    console.log(password)

    const resetPassword = await prisma.restPassword.findFirst({
      where: { token: ResetToken, userId: userId }
    })

    if (!resetPassword) {
      logger.warn('Reset password failed - invalid token', { ResetToken, userId })
      return next(
        new BadRequestException(
          'Invalid reset password token!',
          ErrorCode.INVALID_RESET_PASSWORD_TOKEN
        )
      )
    }

    // Update user password
    const user = await prisma.user.update({
      where: { id: userId },
      data: { password: hashSync(password, 12) }
    })

    // Delete reset password token
    await prisma.restPassword.delete({
      where: { id: resetPassword.id }
    })

    logger.info('Password reset successfully', { userId: user.id })

    // Send success response
    res.json({
      success: true,
      message: 'Password reset successfully!'
    })
  } catch (error) {
    logger.error('Reset password error', { error })
    next(error)
  }
}
