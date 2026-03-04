/**
 * Builds Zod password validation from public password policy (for register, reset-password, change-expired-password).
 */

import * as z from 'zod';
import type { PublicPasswordPolicy } from './api';

export function buildPasswordSchema(policy: PublicPasswordPolicy | null): z.ZodType<string> {
  const minLength = policy?.minLength ?? 8;
  let schema: z.ZodType<string> = z.string().min(minLength, `Password must be at least ${minLength} characters`);

  if (policy?.requireUppercase) {
    schema = schema.refine((val) => /[A-Z]/.test(val), 'Must contain at least one uppercase letter');
  }
  if (policy?.requireLowercase) {
    schema = schema.refine((val) => /[a-z]/.test(val), 'Must contain at least one lowercase letter');
  }
  if (policy?.requireDigit) {
    schema = schema.refine((val) => /[0-9]/.test(val), 'Must contain at least one digit');
  }
  if (policy?.requireSpecial) {
    schema = schema.refine(
      (val) => /[^A-Za-z0-9]/.test(val),
      'Must contain at least one special character'
    );
  }

  return schema;
}

export function passwordSchemaWithConfirm(policy: PublicPasswordPolicy | null) {
  return z
    .object({
      newPassword: buildPasswordSchema(policy),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });
}

export type PasswordWithConfirmForm = z.infer<ReturnType<typeof passwordSchemaWithConfirm>>;
