import 'dotenv/config';

export const settings = Object.freeze({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  dbPath: process.env.DB_PATH ?? './jobs.db',
  defaultEmailRecipient: process.env.DEFAULT_EMAIL_RECIPIENT,
  dailyEmailHour: parseInt(process.env.DAILY_EMAIL_HOUR ?? '9', 10),
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
