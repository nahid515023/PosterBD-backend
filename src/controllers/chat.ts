import { NextFunction, Request, Response } from 'express'
import { prisma } from '../index'
import { logger } from '../services/logger'


export const getChat = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Processing chat request')
    const { connectedId } = req.params
    const chat = await prisma.chat.findMany({
      where: {
        connectedId
      },
      include:{
        connected: true
      }
    })
    logger.info('Chat request successful')
    res.json({ chat })
  } catch (error) {
    logger.error('Chat request error:', error)
    next(error)
  }
}

export const createChat = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Processing chat creation request')
    const { connectedId, message } = req.body
    const connection = await prisma.connectedAccount.findFirst({
      where: {
        id: connectedId
      }
    })
    if (!connection) {
      logger.error('Connection not found')
      return res.status(404).json({ message: 'Connection not found' })
    }
    const chat = await prisma.chat.create({
      data: {
        connectedId,
        message
      },
      include:{
        connected: true
      }
    })
    logger.info('Chat creation successful')
    res.json({ chat })
  } catch (error) {
    logger.error('Chat creation error:', error)
    next(error)
  }
}

export const deleteChat = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Processing chat deletion request')
    const { id } = req.params
    await prisma.chat.delete({
      where: {
        id
      }
    })
    logger.info('Chat deletion successful')
    res.json({ message: 'Chat deleted successfully!' })
  } catch (error) {
    logger.error('Chat deletion error:', error)
    next(error)
  }
}

export const connecteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Processing chat connection request')
    const { contactUserId } = req.params as { contactUserId: string }

    const userId = req.user?.id

    console.log('userId-->',userId)

    const contactUser = await prisma.user.findFirst({
      where: {
        id: contactUserId
      }
    })

    if (!contactUser || !userId) {
      logger.error('User not found')
      return res.status(404).json({ message: 'User not found' })
    }

    const connection = await prisma.connectedAccount.findFirst({
      where: {
      OR: [
        { userId, contactUserId },
        { userId: contactUserId, contactUserId: userId }
      ]
      }
    })

    if (connection) {
      logger.info('Connection already exists')
      return res.status(200).json({ message: 'Connection already exists' })
    }

    await prisma.connectedAccount.create({
      data: {
        userId,
        contactUserId
      }
    })

    logger.info('Chat connection successful')
    res.json({ message: `Connected to ${contactUser?.name}` })
  } catch (error) {
    logger.error('Chat connection error:', error)
    next(error)
  }
}

export const disconnectUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Processing chat disconnection request')
    const { connectedId } = req.params
    await prisma.chat.deleteMany({
      where: {
        connectedId
      }
    })
    await prisma.connectedAccount.deleteMany({
      where: {
        id: connectedId
      }
    })
    logger.info('Chat disconnection successful')
    res.json({ message: 'Disconnected successfully!' })
  } catch (error) {
    logger.error('Chat disconnection error:', error)
    next(error)
  }
}

export const getConnectedUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Processing connected users request')
    const userId = req.user?.id
    
    if (!userId) {
      logger.error('User not found')
      return res.status(404).json({ message: 'User not found' })
    }
    const connectedUsers = await prisma.connectedAccount.findMany({
      where: {
      OR: [
        { userId },
        { contactUserId: userId }
      ]
      },
      include: {
      ContactUser: true,
      User: true
      }
    })
    logger.info('Connected users request successful')
    res.json({ connectedUsers })
  } catch (error) {
    logger.error('Connected users request error:', error)
    next(error)
  }
}
