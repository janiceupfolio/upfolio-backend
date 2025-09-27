import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

export interface EmailTemplateData {
  name: string;
  email: string;
  password?: string;
  loginUrl?: string;
  [key: string]: any;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    });
  }

  /**
   * Read HTML template file
   */
  private readTemplate(templateName: string): string {
    try {
      const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
      return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      console.error(`Error reading template ${templateName}:`, error);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  /**
   * Replace placeholders in template with actual data
   */
  private processTemplate(template: string, data: EmailTemplateData): string {
    let processedTemplate = template;
    
    // Replace all placeholders with actual data
    Object.keys(data).forEach(key => {
      const placeholder = `{{${key.toUpperCase()}}}`;
      processedTemplate = processedTemplate.replace(new RegExp(placeholder, 'g'), data[key]);
    });

    return processedTemplate;
  }

  /**
   * Send email using HTML template
   */
  async sendTemplateEmail(
    to: string,
    subject: string,
    templateName: string,
    data: EmailTemplateData
  ): Promise<boolean> {
    try {
      // Read the template
      const template = this.readTemplate(templateName);
      
      // Process the template with data
      const htmlContent = this.processTemplate(template, data);

      // Email options
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
        to: to,
        subject: subject,
        html: htmlContent,
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  }

  /**
   * Send learner account creation email
   */
  async sendLearnerAccountEmail(
    name: string,
    email: string,
    password: string,
    loginUrl?: string
  ): Promise<boolean> {
    const data: EmailTemplateData = {
      name,
      email,
      password,
      loginUrl: loginUrl || process.env.FRONTEND_URL || "https://your-app.com/login"
    };

    return this.sendTemplateEmail(
      email,
      "Learner Account Created Successfully",
      "learner-account-created",
      data
    );
  }

  /**
   * Send assessor account creation email
   */
  async sendAssessorAccountEmail(
    name: string,
    email: string,
    password: string,
    loginUrl?: string
  ): Promise<boolean> {
    const data: EmailTemplateData = {
      name,
      email,
      password,
      loginUrl: loginUrl || process.env.FRONTEND_URL || "https://your-app.com/login"
    };

    return this.sendTemplateEmail(
      email,
      "Assessor Account Created Successfully",
      "assessor-account-created",
      data
    );
  }


  /**
   * Send custom email with any template
   */
  async sendCustomEmail(
    to: string,
    subject: string,
    templateName: string,
    data: EmailTemplateData
  ): Promise<boolean> {
    return this.sendTemplateEmail(to, subject, templateName, data);
  }
}

// Create a singleton instance
export const emailService = new EmailService(); 