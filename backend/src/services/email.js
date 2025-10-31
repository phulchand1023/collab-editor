import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendShareNotification(toEmail, documentTitle, sharedBy, shareUrl) {
    try {
      if (!process.env.SMTP_USER) {
        logger.warn('SMTP not configured, skipping email');
        return false;
      }

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: toEmail,
        subject: `${sharedBy} shared a document with you`,
        html: `
          <h2>Document Shared</h2>
          <p><strong>${sharedBy}</strong> has shared the document "<strong>${documentTitle}</strong>" with you.</p>
          <p><a href="${shareUrl}" style="background: #007acc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Open Document</a></p>
          <p>You can access this document anytime by clicking the link above.</p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Share notification sent to ${toEmail}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }
}

export default new EmailService();