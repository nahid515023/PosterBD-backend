import { Router } from 'express';
import { 
  createNotification, 
  getAllNotifications, 
  markNotificationAsRead,
  getUnreadCount,
  deleteNotification,
  markAllAsRead
} from '../controllers/notification';
import { authMiddleware } from '../middlewares/auth';

const notificationRouter = Router();

// Create and get notifications
notificationRouter.post('/', authMiddleware, createNotification);
notificationRouter.get('/', authMiddleware, getAllNotifications);

// Manage notification status
notificationRouter.patch('/:id/read', authMiddleware, markNotificationAsRead);
notificationRouter.patch('/mark-all-read', authMiddleware, markAllAsRead);

// Get unread count
notificationRouter.get('/unread-count', authMiddleware, getUnreadCount);

// Delete notification
notificationRouter.delete('/:id', authMiddleware, deleteNotification);

export default notificationRouter;