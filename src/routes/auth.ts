import { Router } from 'express'
import { login, signup,emailVerification,forgotPassword,resetPassword } from '../controllers/auth'
import { errorHandler } from '../error-hander'

const authRoutes: Router = Router()

authRoutes.post('/login', errorHandler(login))
authRoutes.post('/signup', errorHandler(signup))
authRoutes.put('/verify', errorHandler(emailVerification))
authRoutes.post('/forgot-password', errorHandler(forgotPassword))
authRoutes.post('/reset-password/:ResetToken/:userId', errorHandler(resetPassword))



export default authRoutes
