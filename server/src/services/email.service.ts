import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter;

  static async initialize() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // 验证连接配置
      await this.transporter.verify();
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  static async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (!this.transporter) {
        await this.initialize();
      }

      const mailOptions = {
        from: options.from || process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}`, { messageId: result.messageId });
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  static async sendBulkEmail(emails: EmailOptions[]): Promise<void> {
    try {
      const promises = emails.map(email => this.sendEmail(email));
      await Promise.all(promises);
      logger.info(`Bulk email sent successfully to ${emails.length} recipients`);
    } catch (error) {
      logger.error('Failed to send bulk email:', error);
      throw error;
    }
  }

  static async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      logger.info('Email service closed');
    }
  }
}
