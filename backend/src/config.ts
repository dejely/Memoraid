import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SYNC_ACCESS_TOKEN: z.string().trim().min(1).optional(),
  CORS_ORIGIN: z.string().optional(),
});

const env = envSchema.parse(process.env);

export const appConfig = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  syncAccessToken: env.SYNC_ACCESS_TOKEN ?? null,
  corsOrigins: env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(",").map((value) => value.trim()).filter(Boolean)
    : [],
} as const;
