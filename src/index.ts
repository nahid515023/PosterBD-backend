import express from 'express';
import rootRouter from './routes';
import { PrismaClient } from '@prisma/client';
import { PORT } from './secrets';
import cors from 'cors';
import { errorMiddleware } from './middlewares/errors';
import cookieParser from 'cookie-parser';
import { createLogger } from './services/logger';

const app = express();
export const prisma = new PrismaClient();
const logger = createLogger('server');

// Middleware to serve static files
app.use('', express.static('uploads'));

// Middleware to parse cookies
app.use(cookieParser());

// Middleware to parse JSON bodies
app.use(express.json());

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Root router
app.use('/api', rootRouter);

// Middleware to handle unknown routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

// Error handling middleware
app.use(errorMiddleware);

// Start the server
app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    logger.info(`App listening at port ${PORT}`);
  } catch (error) {
    logger.error('Failed to connect to the database:', error);
    process.exit(1);
  }
});
