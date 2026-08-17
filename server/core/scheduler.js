import cron from 'node-cron';
import { settings } from '../config/settings.js';
import { runFullPipeline } from './pipeline.js';

let cronTask = null;

export function initScheduler() {
  const hour = settings.dailyEmailHour || 9;
  // Format cron expression: "0 <hour> * * *" (runs exactly at the top of the hour)
  const cronExpression = `0 ${hour} * * *`;

  if (cronTask) {
    cronTask.stop();
  }

  // PRD requirement: specific timezone handling (IST / Asia/Kolkata)
  cronTask = cron.schedule(cronExpression, async () => {
    console.log(`[scheduler] Triggering daily AntiGravity pipeline at ${hour}:00 IST...`);
    try {
      const result = await runFullPipeline(false);
      if (result.success) {
        console.log(`[scheduler] Pipeline completed successfully. Emailed ${result.email?.jobCount || 0} jobs.`);
      } else {
        console.error(`[scheduler] Pipeline failed:`, result.error);
      }
    } catch (err) {
      console.error(`[scheduler] Uncaught error during pipeline run:`, err);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  console.log(`[scheduler] Initialized. Daily run scheduled for ${hour}:00 Asia/Kolkata.`);
}
