import { Router } from 'express'
import {
  createPost,
  getPosts,
  deletePost,
  updatePost,
  getUserAllPost,
  likePost
} from '../controllers/post'
import { errorHandler } from '../error-hander'
import { authMiddleware } from '../middlewares/auth'

const postRoutes: Router = Router()

postRoutes.get('/', authMiddleware, errorHandler(getPosts))
postRoutes.post('/', authMiddleware, errorHandler(createPost))
postRoutes.delete('/:id', authMiddleware, errorHandler(deletePost))
postRoutes.put('/:id', authMiddleware, errorHandler(updatePost))
postRoutes.get('/my-post', authMiddleware, errorHandler(getUserAllPost))
postRoutes.post('/like/:id', authMiddleware, errorHandler(likePost))

export default postRoutes
