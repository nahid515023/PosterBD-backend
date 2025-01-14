import { Request, Response, NextFunction } from 'express'
import { prisma } from '..'
import { createLogger } from '../services/logger'
import redis from '../services/cache'

const logger = createLogger('post-controller')
const CACHE_TTL = 3600 // 1 hour

interface QueryParams {
  page?: number
  limit?: number
  sort?: 'asc' | 'desc'
  category?: string
}

export const getPosts = async (
  req: Request<{}, {}, {}, QueryParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        User: true,
        TutorRequest: true
      }
    })
    if (!posts) {
      logger.error('Fetching posts failed')
      return res.status(404).json({ message: 'Fetching posts failed' })
    }

    logger.info('Fetching posts successful')
    console.log(posts)
    res.status(200).json({ posts: posts })
  } catch (error) {
    logger.error('Error fetching posts:', error)
    next(error)
  }
}

export const createPost = async (req: Request, res: Response) => {
  const { medium, selectedClass, subject, fees, description } = req.body
  const userId = req.user?.id
  
  if(req.user?.role === 'TEACHER') {
    return res.status(400).json({ message: 'Only student can create post!' })
  }

  try {
    console.log('Create post:', req.body)
    await prisma.post.create({
      data: {
        medium,
        Class: selectedClass,
        subject,
        fees,
        description,
        userId
      }
    })

    logger.info('Create post successfuly!')
    res.status(200).json({ message: 'Create post successfuly!' })
  } catch (err) {
    logger.error('Create post failed:', err)
    console.log(err)
    res.status(400).json({ message: 'Create post failed!' })
  }
}

export const updatePost = async (req: Request, res: Response) => {
  const { id } = req.params
  const { medium, Class, subject, fees, description } = req.body
  const userId = req.user?.id

  try {
    await prisma.post.update({
      where: {
        id
      },
      data: {
        medium,
        Class,
        subject,
        fees,
        description,
        userId
      }
    })

    const posts = await prisma.post.findMany({
      where: {
        userId
      }
    })

    await redis.del(`userAllPost:${userId}`)
    await redis.set(`userAllPost:${userId}`, JSON.stringify(posts), 'EX', 3600)

    res.status(200).json({ posts: posts, message: 'Update post success!' })
  } catch (err) {
    res.status(400).json({ message: 'Update post failed!' })
  }
}

export const deletePost = async (req: Request, res: Response) => {
  const userId = req.user?.id
  try {
    const { id } = req.params
    await prisma.post.delete({
      where: {
        id
      }
    })

    const posts = await prisma.post.findMany({
      where: {
        userId
      }
    })
    await redis.del(`userAllPost:${userId}`)
    await redis.set(`userAllPost:${userId}`, JSON.stringify(posts), 'EX', 3600)
    res.status(200).json({ posts: posts, message: 'Delete post success!' })
  } catch (err) {
    res.status(400).json({ message: 'Delete post failed!' })
  }
}

export const getPostById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const interested = await prisma.tutorRequest.findFirst({
      where: {
        postId: id,
        userId: req.user?.id
      }
    })
    const posts = await prisma.post.findFirst({
      where: {
        id
      },
      include: {
        User: true,
        TutorRequest: true
      }
    })
    res.status(200).json({ post: posts, interested: interested ? true : false })
  } catch (err) {
    res.status(400).json({ message: 'Post dose not found!' })
  }
}

export const getTutorRequest = async (req: Request, res: Response) => {
  const { postId } = req.params
  // if (req.user?.role !== 'STUDENT') {
  //   return res.status(400).json({ message: 'Only teacher can request tutor!' })
  // }

  try {
    const date = await prisma.tutorRequest.findMany({
      where: {
        postId
      },
      include: {
        User: true
      }
    })
    console.log(date)
    res.status(200).json({ allRequest: date })
  } catch (err) {
    res.status(400).json({ message: 'Request tutor failed!' })
  }
}

export const createTutorRequest = async (req: Request, res: Response) => {
  const userId = req.user?.id
  const { postId } = req.params

  if (req.user?.role !== 'TEACHER') {
    return res.status(400).json({ message: 'Only teacher can request tutor!' })
  }

  console.log('Interests', userId, postId)

  try {
    await prisma.tutorRequest.create({
      data: {
        postId,
        userId
      }
    })
    res.status(200).json({ message: 'Request tutor success!' })
  } catch (err) {
    res.status(400).json({ message: 'Request tutor failed!' })
  }
}

export const removeTutorRequest = async (req: Request, res: Response) => {
  const userId = req.user?.id
  const { postId } = req.params

  if (req.user?.role !== 'TEACHER') {
    return res.status(400).json({ message: 'Only Author can delete!' })
  }

  try {
    const data = await prisma.tutorRequest.findFirst({
      where: {
        postId,
        userId
      }
    })
    if (!data) {
      return res.status(400).json({ message: 'Request not found!' })
    }
    await prisma.tutorRequest.delete({
      where: {
        id: data.id
      }
    })
    res.status(200).json({ message: 'Remove successful!' })
  } catch (err) {
    res.status(400).json({ message: 'Remove failed!' })
  }
}

// export const getLikePost = async (req: Request, res: Response) => {
//   const { id } = req.params
//   const cacheLike = await redis.get(`PostLike:${id}`)
//   if (cacheLike) {
//     res.json({ message: 'Get like post success!', like: JSON.parse(cacheLike) })
//   }

//   try {
//     await prisma.like.findMany({
//       where: {
//         postId: id
//       }
//     })
//     await redis.set(`PostLike:${id}`, JSON.stringify(cacheLike), 'EX', 3600)
//     res.status(200).json({ message: 'Like post success!' })
//   } catch (err) {
//     res.status(400).json({ message: 'Like post failed!' })
//   }
// }

// export const likePost = async (req: Request, res: Response) => {
//   const { id } = req.params
//   const userId = req.user?.id
//   try {
//     await prisma.like.create({
//       data: {
//         postId: id,
//         userId
//       }
//     })

//     const likes = await prisma.like.findMany({
//       where: {
//         postId: id
//       }
//     })
//     await redis.set(`PostLike:${id}`, JSON.stringify(likes), 'EX', 3600)

//     res.status(200).json({ message: 'Like post success!' })
//   } catch (err) {
//     res.status(400).json({ message: 'Like post failed!' })
//   }
// }

export const getUserAllPost = async (req: Request, res: Response) => {
  const userId = req.user?.id

  let userAllPost = await redis.get(`userAllPost:${userId}`)

  if (userAllPost) {
    return res.status(200).json({
      posts: JSON.parse(userAllPost),
      message: 'Get user post success!'
    })
  }

  const posts = await prisma.post.findMany({
    where: {
      userId
    }
  })

  await redis.set(`userAllPost:${userId}`, JSON.stringify(posts), 'EX', 3600)

  res.status(200).json({ posts: posts, message: 'Get user post success!' })
}
