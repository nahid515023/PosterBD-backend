import { Request, Response, NextFunction } from 'express';
import { prisma } from '..'
import { createLogger } from '../services/logger';
import redis from '../services/cache';


const logger = createLogger('post-controller');
const CACHE_TTL = 3600; // 1 hour

interface QueryParams {
  page?: number;
  limit?: number;
  sort?: 'asc' | 'desc';
  category?: string;
}

export const getPosts = async (
  req: Request<{}, {}, {}, QueryParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'desc',
      category 
    } = req.query;

    logger.info('Fetching posts', { page, limit, sort, category });

    // Try cache first
    const cacheKey = `posts:${page}:${limit}:${sort}:${category || 'all'}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      logger.debug('Returning cached posts');
      return res.status(200).json(JSON.parse(cached));
    }

    const skip = (page - 1) * limit;
    
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: category ? {
          catagoeryId: category
        } : undefined,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          Catagoery: true,
          Like: {
            select: {
              userId: true
            }
          }
        },
        orderBy: {
          createdAt: sort
        },
        skip,
        take: limit
      }),
      prisma.post.count({
        where: category ? {
          catagoeryId: category
        } : undefined
      })
    ]);

    const response = {
      posts,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      },
      message: 'Posts fetched successfully!'
    };

    // Cache response
    await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL);
    
    logger.info('Posts fetched successfully', { count: posts.length });
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching posts:', error);
    next(error);
  }
};

export const createPost = async (req: Request, res: Response) => {
  const { content, latitude, longitude, catagoeryId } = req.body
  const userId = req.user?.id

  try {
    await prisma.post.create({
      data: {
        content,
        latitude,
        longitude,
        catagoeryId,
        authorId: userId
      }
    })

    const posts = await prisma.post.findMany({
      where: {
        authorId: userId
      }
    })
    await redis.del(`userAllPost:${userId}`)
    await redis.set(`userAllPost:${userId}`, JSON.stringify(posts), 'EX', 3600)
    logger.info('Create post successfuly!')
    res.status(200).json({ posts: posts, message: 'Create post successfuly!' })
  } catch (err) {
    logger.error('Create post failed:', err)
    res.status(400).json({ message: 'Create post failed!' })
  }
}

export const updatePost = async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = req.user?.id
  const { content, latitude, longitude, catagoeryId } = req.body
  try {
    await prisma.post.update({
      where: {
        id
      },
      data: {
        content,
        latitude,
        longitude,
        catagoeryId
      }
    })

    const posts = await prisma.post.findMany({
      where: {
        authorId: userId
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
        authorId: userId
      }
    })
    await redis.del(`userAllPost:${userId}`)
    await redis.set(`userAllPost:${userId}`, JSON.stringify(posts), 'EX', 3600)
    res.status(200).json({ posts: posts, message: 'Delete post success!' })
  } catch (err) {
    res.status(400).json({ message: 'Delete post failed!' })
  }
}

export const getLikePost = async (req: Request, res: Response) => {
  const { id } = req.params
  const cacheLike = await redis.get(`PostLike:${id}`)
  if (cacheLike) {
    res.json({ message: 'Get like post success!', like: JSON.parse(cacheLike) })
  }

  try {
    await prisma.like.findMany({
      where: {
        postId: id
      }
    })
    await redis.set(`PostLike:${id}`, JSON.stringify(cacheLike), 'EX', 3600)
    res.status(200).json({ message: 'Like post success!' })
  } catch (err) {
    res.status(400).json({ message: 'Like post failed!' })
  }
}

export const likePost = async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = req.user?.id
  try {
    await prisma.like.create({
      data: {
        postId: id,
        userId
      }
    })

    const likes = await prisma.like.findMany({
      where: {
        postId: id
      }
    })
    await redis.set(`PostLike:${id}`, JSON.stringify(likes), 'EX', 3600)

    res.status(200).json({ message: 'Like post success!' })
  } catch (err) {
    res.status(400).json({ message: 'Like post failed!' })
  }
}

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
      authorId: userId
    }
  })

  await redis.set(`userAllPost:${userId}`, JSON.stringify(posts), 'EX', 3600)

  res.status(200).json({ posts: posts, message: 'Get user post success!' })
}
