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
      login_url: loginUrl || process.env.FRONTEND_URL || "https://www.upfolioplus.co.uk/login"
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
      login_url: loginUrl || process.env.FRONTEND_URL || "https://www.upfolioplus.co.uk/login"
    };

    return this.sendTemplateEmail(
      email,
      "Assessor Account Created Successfully",
      "assessor-account-created",
      data
    );
  }

  /**
   * Send Center Admin creation email
   */
  async sendCenterAdminAccountEmail(
    name: string,
    email: string,
    password: string,
    center: string,
    loginUrl?: string,
  ): Promise<boolean> {
    const data: EmailTemplateData = {
      name,
      email,
      password,
      login_url: loginUrl || process.env.FRONTEND_URL || "https://www.upfolioplus.co.uk/login",
      center_name: center
    }
    return this.sendTemplateEmail(
      email,
      "Center Account Created Successfully",
      "center-account-created",
      data
    );
  }

  /**
   * Send EQA creation email
   */
  async sendEQAAccountEmail(
    name: string,
    email: string,
    password: string,
    loginUrl?: string,
  ): Promise<boolean> {
    const data: EmailTemplateData = {
      name,
      email,
      password,
      login_url: loginUrl || process.env.FRONTEND_URL || "https://www.upfolioplus.co.uk/login",
    }
    return this.sendTemplateEmail(
      email,
      "EQA Account Created Successfully",
      "eqa-account-created",
      data
    );
  }

  /**
   * Send IQA creation email
   */
  async sendIQAAccountEmail(
    name: string,
    email: string,
    password: string,
    loginUrl?: string,
  ): Promise<boolean> {
    const data: EmailTemplateData = {
      name,
      email,
      password,
      login_url: loginUrl || process.env.FRONTEND_URL || "https://www.upfolioplus.co.uk/login",
    }
    return this.sendTemplateEmail(
      email,
      "IQA Account Created Successfully",
      "iqa-account-created",
      data
    );
  }

  /**
   * Send Contact US Email Customer
   */
  async sendContactUsCustomerEmail(
    email: string,
    name: string
  ): Promise<boolean> {
    const data: EmailTemplateData = {
      name,
      email
    }
    return this.sendTemplateEmail(
      email,
      "Upfolio Plus – Thank You for Contacting Us",
      "contact-us-customer",
      data
    )
  }

  /**
   * Send Contact US Email Admin
   */
  async sendContactUsAdminEmail(
    name: string,
    email: string,
    message: string
  ): Promise<boolean> {
    const data: EmailTemplateData = {
      name,
      email,
      message
    }
    return this.sendTemplateEmail(
      "urmilparsaniya4@gmail.com", // admin@upfolioplus.co.uk
      `New Contact Request Received from ${name || "Guest"}`,
      "contact-us-admin",
      data
    )
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