import nodemailer from 'nodemailer';
import { settings } from '../config/settings.js';

/**
 * Validates and gets SMTP config.
 */
function getSmtpConfig() {
  const { smtp } = settings;
  if (!smtp.user || !smtp.pass) {
    throw new Error('SMTP credentials not configured (SMTP_USER / SMTP_PASS).');
  }
  
  return {
    host: smtp.host || 'smtp.gmail.com',
    port: parseInt(smtp.port, 10) || 465,
    secure: smtp.port === '465' || (!smtp.port && true), // 465 is secure, 587 is not (requires STARTTLS)
    auth: {
      user: smtp.user,
      pass: smtp.pass
    }
  };
}

/**
 * Sends the HTML digest email.
 * @param {string} html 
 * @param {string} recipient 
 * @param {number} jobCount 
 * @param {boolean} isDryRun 
 */
export async function sendDigest(html, recipient, jobCount, isDryRun = false) {
  if (!recipient) {
    throw new Error('No recipient email resolved. Check active profile or DEFAULT_EMAIL_RECIPIENT.');
  }

  const subject = `AntiGravity Daily Digest: ${jobCount} Jobs Ready`;

  if (isDryRun) {
    return {
      success: true,
      isDryRun: true,
      recipient,
      subject,
      jobCount,
      htmlPreview: html.substring(0, 500) + '...' // Return a snippet for verification
    };
  }

  const config = getSmtpConfig();
  const transporter = nodemailer.createTransport(config);

  const mailOptions = {
    from: `"AntiGravity Pipeline" <${config.auth.user}>`,
    to: recipient,
    subject: subject,
    html: html
  };

  const info = await transporter.sendMail(mailOptions);

  if (nodemailer.getTestMessageUrl) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[mailer] Ethereal preview URL: ${previewUrl}`);
      info.previewUrl = previewUrl;
    }
  }

  return {
    success: true,
    messageId: info.messageId,
    previewUrl: info.previewUrl,
    recipient,
    jobCount
  };
}
