import 'dotenv/config';

export const settings = Object.freeze({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  dbPath: process.env.DB_PATH ?? './jobs.db',
});
