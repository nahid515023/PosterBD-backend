import { z } from 'zod'

export const signUpSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  cPassword: z.string().min(8),
  gender: z.string(),
  dob: z.string()
})

export const logInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  checked: z.boolean()
})

export const emailSchema = z.object({
  email: z.string().email(),
});
