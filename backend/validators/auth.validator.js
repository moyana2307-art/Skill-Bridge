// Validation rules for registration and login.
const { z } = require('zod');

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(255, 'Email is too long');

const registerBody = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name is too long'),
    email: emailField,
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be 72 characters or fewer'),
  })
  .strict();

const loginBody = z
  .object({
    email: emailField,
    password: z.string().min(1, 'Password is required').max(72, 'Password is too long'),
  })
  .strict();

module.exports = { registerBody, loginBody };
