import { NextFunction, Request, Response } from 'express'
import { logInSchema, signUpSchema } from '../schema/users'
import { prisma } from '../index'
import { BadRequestException } from '../exceptions/bad-request'
import { ErrorCode } from '../exceptions/root'
import { hashSync, compareSync } from 'bcrypt'
import { NotFoundException } from '../exceptions/not-found'

import * as jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../secrets'

import rateLimit from 'express-rate-limit'
import { createLogger } from '../services/logger'
import { sanitizeInput } from '../utils/sanitizer'

const logger = createLogger('auth-controller')

// Rate limiting
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: 'Too many accounts created, please try again later.'
})

// Login function
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Processing login request', { email: req.body.email });
    logInSchema.parse(req.body);
    const { email, password, checked } = req.body;

    const user = await prisma.user.findFirst({
      where: { email }
    });

    if (!user) {
      logger.warn('Login failed - user not found', { email });
      return next(
        new NotFoundException('User not found!', ErrorCode.USER_NOT_FOUND)
      );
    }

    if (!compareSync(password, user.password)) {
      logger.warn('Login failed - incorrect password', { email });
      return next(
        new BadRequestException(
          'Incorrect password!',
          ErrorCode.INCORRECT_PASSWORD
        )
      );
    }

    logger.debug('Generating JWT token', { userId: user.id });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET!, { expiresIn: '1d' });
    const maxAge = checked ? 24 * 3600 * 1000 * 30 : 24 * 3600 * 1000;

    logger.info('Login successful', { userId: user.id });
    res
      .cookie('token', token, { httpOnly: false, maxAge })
      .cookie('user', user, { httpOnly: false, maxAge })
      .json({
        message: 'Login successful!'
      });
  } catch (error) {
    logger.error('Login error', { error });
    next(error);
  }
};

// Signup function  
export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Apply rate limiting
    await signupLimiter(req, res, () => {})

    logger.info('Processing signup request')

    // Validate input
    const validatedData = signUpSchema.parse(req.body)

    // Sanitize inputs
    const { name, email, password, cPassword, gender, dob } =
      sanitizeInput(validatedData)

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      logger.warn(`Signup attempt with existing email: ${email}`)
      throw new BadRequestException(
        'User already exists!',
        ErrorCode.USER_ALREADY_EXISTS
      )
    }

    // Validate password match
    if (password !== cPassword) {
      throw new BadRequestException(
        "Passwords don't match!",
        ErrorCode.PASSWORD_DO_NOT_MATCH
      )
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashSync(password, 12), // Increased rounds for better security
        dob,
        gender,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        gender: true,
        dob: true,
        createdAt: true
      }
    })

    logger.info(`User created successfully: ${user.id}`)

    // Send success response
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }
    })
  } catch (error) {
    logger.error('Signup error:', error)
    next(error)
  }
}

