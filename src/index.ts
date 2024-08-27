import express from 'express'
import rootRouter from './routes'
import { PrismaClient } from '@prisma/client'
import { PORT } from './secrets'
import cors from 'cors'
import { errorMiddleware } from './middlewares/errors'
const cookieParser = require('cookie-parser');

const app = express()

export const prisma = new PrismaClient()


app.use(cookieParser());
app.use(express.json())
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use('/api', rootRouter)
app.use(errorMiddleware)

app.listen(PORT, () => {
  console.log(`App listening at port ${PORT}`)
})
