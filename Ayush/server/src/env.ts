import "dotenv/config";

import { z } from "zod";

function parseClientOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

const envSchema = z.object({
  NODE_ENV: z.string().optional().default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  /** Comma-separated browser origins (e.g. multiple Vite dev servers). */
  CLIENT_ORIGIN: z
    .string()
    .min(1)
    .transform(parseClientOrigins)
    .refine((origins) => origins.length > 0, "CLIENT_ORIGIN must list at least one origin"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  /** Pino log level (e.g. info, warn, error, debug). */
  LOG_LEVEL: z.string().optional().default("info"),
  /** Directory for student PDF uploads (relative to process.cwd() unless absolute). */
  UPLOAD_DIR: z.string().optional().default("data/uploads"),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
