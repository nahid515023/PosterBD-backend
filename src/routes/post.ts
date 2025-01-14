import { Router } from 'express'
import {
  createPost,
  getPosts,
  deletePost,
  updatePost,
  getUserAllPost,
  getPostById,
  createTutorRequest,
  removeTutorRequest,
  getTutorRequest
} from '../controllers/post'
import { errorHandler } from '../error-hander'
import { authMiddleware } from '../middlewares/auth'

const postRoutes: Router = Router()

postRoutes.get('/', errorHandler(getPosts))
postRoutes.get('/:id', errorHandler(getPostById))
postRoutes.post('/', authMiddleware, errorHandler(createPost))
postRoutes.delete('/:id', authMiddleware, errorHandler(deletePost))
postRoutes.put('/:id', authMiddleware, errorHandler(updatePost))
postRoutes.get('/my-post', authMiddleware, errorHandler(getUserAllPost))
//request-tutor
postRoutes.get('/request/:postId', errorHandler(getTutorRequest))
postRoutes.post('/request/:postId', authMiddleware, errorHandler(createTutorRequest))
postRoutes.delete('/request/:postId', authMiddleware, errorHandler(removeTutorRequest))

// postRoutes.post('/like/:id', authMiddleware, errorHandler(likePost))

export default postRoutes
