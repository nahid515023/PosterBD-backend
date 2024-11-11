import { Router } from 'express'
import authRoutes from './auth'
import profileRoutes from './profile'
import postRoutes from './post'
import notificationRouter from './notification'


const rootRouter: Router = Router()

rootRouter.use('/auth',authRoutes)
rootRouter.use('/profile',profileRoutes)
rootRouter.use('/post',postRoutes)
rootRouter.use('/notifications',notificationRouter);
export default rootRouter
