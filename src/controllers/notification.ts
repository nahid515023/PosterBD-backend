import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification';
import { createLogger } from '../services/logger';
import { BadRequestException } from '../exceptions/bad-request';
import { ErrorCode } from '../exceptions/root';

const logger = createLogger('notification-controller');

export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success'
}

interface CreateNotificationBody {
  userId: string;
  type: NotificationType;
  message: string;
}

export const createNotification = async (
  req: Request<{}, {}, CreateNotificationBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, type, message } = req.body;
    
    if (!userId || !type || !message) {
      throw new BadRequestException('Missing required fields', ErrorCode.INVALID_INPUT);
    }

    logger.info(`Creating notification for user: ${userId}`);
    const notification = await NotificationService.createNotification({userId, type, message});
    
    logger.debug(`Notification created: ${notification.id}`);
    res.status(201).json(notification);
  } catch (error) {
    logger.error('Error creating notification:', error);
    next(error);
  }
};

export const getAllNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    console.log(userId)
    if (!userId) {
      throw new BadRequestException('User not authenticated', ErrorCode.UNAUTHORIZED);
    }

    logger.info(`Fetching notifications for user: ${userId}`);
    const notifications = await NotificationService.getNotifications(userId);
    
    res.status(200).json(notifications);
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    next(error);
  }
};

export const markNotificationAsRead = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new BadRequestException('Notification ID required', ErrorCode.INVALID_INPUT);
    }

    logger.info(`Marking notification as read: ${id}`);
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated', ErrorCode.UNAUTHORIZED);
    }

    const notification = await NotificationService.markAsRead(id, userId);
    
    res.status(200).json(notification);
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    next(error);
  }
};

export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    logger.info(`Getting unread count for user: ${userId}`);
    const count = await NotificationService.getUnreadCount(userId);
    
    res.status(200).json({ count });
  } catch (error) {
    logger.error('Error getting unread count:', error);
    next(error);
  }
};

export const deleteNotification = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!id) {
      throw new BadRequestException('Notification ID required', ErrorCode.INVALID_INPUT);
    }

    logger.info(`Deleting notification: ${id}`);
    await NotificationService.deleteNotification(id, userId);
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting notification:', error);
    next(error);
  }
};

export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    logger.info(`Marking all notifications as read for user: ${userId}`);
    await NotificationService.markAllAsRead(userId);
    
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    next(error);
  }
};
