import { Router } from 'express'
import authRoutes from './auth'
import postRoutes from './post'
import profileRoutes from './profile'
import chatRouter from './chat'



const rootRouter: Router = Router()

rootRouter.use('/auth',authRoutes)
rootRouter.use('/profile',profileRoutes)
rootRouter.use('/posts',postRoutes)
rootRouter.use('/chat',chatRouter);
// rootRouter.use('/notifications',notificationRouter);
export default rootRouter
