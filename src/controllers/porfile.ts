import { NextFunction, Request, Response } from 'express'
import { logger } from '../services/logger'
import { prisma } from '..'
import { unlinkSync } from 'fs'
import { ErrorCode } from '../exceptions/root'
import {BadRequestException} from '../exceptions/bad-request'
import { NotFoundException } from '../exceptions/not-found'
import { UnprocessableEntity } from '../exceptions/validation'
import { hashSync, compareSync } from 'bcrypt'

const maxAge = 24 * 3600 * 1000 * 30

export const updateProfile = async (req: Request, res: Response) => {
  const { name, dob, gender, email } = req.body
  const user = await prisma.user.update({
    where: {
      id: req.user?.id
    },
    data: {
      name,
      dob,
      email,
      gender
    }
  })

  res
    .cookie('user', user, { httpOnly: false,maxAge})
    .json({ message: 'Update Successful!', user })
}

export const updateImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const image = req.file?.filename
  const oldImage = req.user?.image
  let user
  try {
    user = await prisma.user.update({
      where: {
        id: req.user?.id
      },
      data: {
        image
      }
    })
    if (oldImage) {
      unlinkSync(`uploads/${oldImage}`)
    }
  } catch (error) {
    return next(
      new UnprocessableEntity(
        error,
        'File upload failed!',
        ErrorCode.UNPROCESSABLE_ENTITY
      )
    )
  }

  res
    .cookie('user', user, { httpOnly: false, maxAge })
    .json({ message: 'Update Successful!', user })
}

export const getUser = async (req: Request, res: Response) => {
  const user = await prisma.user.findFirst({
    where: {
      id: req.user?.id
    },
    select: {
      id: true,
      name: true,
      email: true,
      dob: true
    }
  })
  res.json({ user })
}


export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Processing password change request');
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      logger.warn('Password change failed - user not authenticated');
      throw new BadRequestException('User not authenticated', ErrorCode.UNAUTHORIZED);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      logger.warn('Password change failed - user not found', { userId });
      throw new NotFoundException('User not found', ErrorCode.USER_NOT_FOUND);
    }

    logger.debug('Verifying current password', { userId });
    if (!compareSync(currentPassword, user.password)) {
      logger.warn('Password change failed - incorrect current password', { userId });
      throw new BadRequestException('Incorrect password', ErrorCode.INCORRECT_PASSWORD);
    }

    logger.debug('Updating password', { userId });
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashSync(newPassword, 10)
      }
    });

    logger.info('Password updated successfully', { userId });
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Password change error:', error);
    next(error);
  }
};



export const changeEmail = async (
  req: Request,
  res: Response, 
  next: NextFunction
) => {
  try {
    logger.info('Processing email change request');
    const { email } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      logger.warn('Email change failed - user not authenticated');
      throw new BadRequestException('User not authenticated', ErrorCode.UNAUTHORIZED);
    }

    logger.debug('Updating email', { userId, newEmail: email });
    const user = await prisma.user.update({
      where: { id: userId },
      data: { email }
    });

    logger.info('Email updated successfully', { userId });
    res.json({ 
      message: 'Email updated successfully',
      user
    });
  } catch (error) {
    logger.error('Email change error:', error);
    next(error);
  }
};


