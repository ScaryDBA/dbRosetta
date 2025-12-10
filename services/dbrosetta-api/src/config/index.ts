import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().url(),

  // Azure Key Vault (optional in development)
  AZURE_KEY_VAULT_NAME: z.string().optional(),
  AZURE_TENANT_ID: z.string().optional(),
  AZURE_CLIENT_ID: z.string().optional(),
  AZURE_CLIENT_SECRET: z.string().optional(),

  // JWT / Auth
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_ISSUER: z.string().url(),
  JWT_AUDIENCE: z.string(),
  JWKS_URI: z.string().url(),
  
  // WordPress Integration
  WORDPRESS_JWT_SECRET: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().transform((val) => val.split(',')),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  RATE_LIMIT_TIMEWINDOW: z.string().transform(Number).default('60000'),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // OpenTelemetry
  OTEL_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),

  // Feature Flags
  ENABLE_SWAGGER: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_METRICS: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
});

export type Config = z.infer<typeof envSchema>;

let config: Config;

export function loadConfig(): Config {
  try {
    config = envSchema.parse(process.env);
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment configuration:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}

export function getConfig(): Config {
  if (!config) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return config;
}
