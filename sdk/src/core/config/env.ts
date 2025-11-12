import { z } from 'zod';
import type { AutoFiConfig } from '../types.js';
import { ConfigError } from '../errors.js';

const envSchema = z.object({
  PIN_ENDPOINT: z.string().optional(),
  PIN_TOKEN: z.string().optional(),
});

/**
 * Read configuration from environment variables.
 */
export function readConfigFromEnv(env: NodeJS.ProcessEnv = process.env): Omit<AutoFiConfig, 'env'> {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(`Invalid environment: ${parsed.error.message}`);
  }
  const data = parsed.data;
  return {
    pin: data.PIN_ENDPOINT && data.PIN_TOKEN ? { endpoint: data.PIN_ENDPOINT, token: data.PIN_TOKEN } : undefined,
  };
}


