import { z } from 'zod'

export const signUpSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().optional(),
})

export const logInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.string().optional(),
  
})

export const emailSchema = z.object({
  email: z.string().email(),
});
