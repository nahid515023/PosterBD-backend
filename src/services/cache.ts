import Redis from 'ioredis'

const redis = new Redis({
  host: '127.0.0.1', // Redis server hostname
  port: 6379 // Redis server port
})

redis.on('connect', () => {
  console.log('Connected to Redis')
})

redis.on('error', err => {
  console.error('Redis connection error:', err)
})

export default redis
