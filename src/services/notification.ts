import { prisma } from '../index'
import redis from '../services/cache'
import { BadRequestException } from '../exceptions/bad-request'
import { ErrorCode } from '../exceptions/root'
import { createLogger } from '../services/logger'

const logger = createLogger('notification-service')
const CACHE_TTL = 3600 // 1 hour

export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success'
}

interface NotificationCreate {
  userId: string
  type: NotificationType
  message: string
}

interface PaginationParams {
  page?: number
  limit?: number
}

export class NotificationService {
  private static async getCacheKey (userId: string): Promise<string> {
    return `notifications:${userId}`
  }

  static async createNotification (data: NotificationCreate) {
    try {
      if (!data.userId || !data.type || !data.message) {
        throw new BadRequestException(
          'Missing required fields',
          ErrorCode.INVALID_INPUT
        )
      }

      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          message: data.message
        }
      })

      // Invalidate cache
      await redis.del(await this.getCacheKey(data.userId))

      logger.info(`Created notification: ${notification.id}`)
      return notification
    } catch (error) {
      logger.error('Error creating notification:', error)
      throw error
    }
  }

  static async getNotifications (userId: string, params: PaginationParams = {}) {
    try {
      const { page = 1, limit = 10 } = params
      const skip = (page - 1) * limit

      // // Try cache first
      const cacheKey = await this.getCacheKey(userId)
      const cached = await redis.get(cacheKey)

      if (cached) {
        console.log("cached length: ",cached.length)
        console.log(cached.toString())
        const parsed = JSON.parse(cached as string)
        return parsed.slice(skip, skip + limit)
      }

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })

      console.log(notifications)

      // Cache results
      await redis.set(cacheKey, JSON.stringify(notifications), 'EX', CACHE_TTL)

      return notifications
    } catch (error) {
      logger.error('Error fetching notifications:', error)
      throw error
    }
  }

  static async markAsRead (notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId
        },
        data: { read: true }
      })

      // Invalidate cache
      await redis.del(await this.getCacheKey(userId))

      return notification
    } catch (error) {
      logger.error('Error marking notification as read:', error)
      throw error
    }
  }

  static async markAllAsRead (userId: string) {
    try {
      await prisma.notification.updateMany({
        where: {
          userId,
          read: false
        },
        data: { read: true }
      })

      // Invalidate cache
      await redis.del(await this.getCacheKey(userId))
    } catch (error) {
      logger.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  static async deleteNotification (notificationId: string, userId: string) {
    try {
      await prisma.notification.delete({
        where: {
          id: notificationId,
          userId // Ensure notification belongs to user
        }
      })

      // Invalidate cache
      await redis.del(await this.getCacheKey(userId))
    } catch (error) {
      logger.error('Error deleting notification:', error)
      throw error
    }
  }

  static async getUnreadCount (userId: string): Promise<number> {
    try {
      return await prisma.notification.count({
        where: {
          userId,
          read: false
        }
      })
    } catch (error) {
      logger.error('Error getting unread count:', error)
      throw error
    }
  }
}
