import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

interface WelcomeEmailData {
  userEmail: string
  firstName: string
  lastName: string
  ventureName?: string
  position?: string
}

interface TestEmailData {
  userEmail: string
  userName: string
  ventureName: string
}

interface IntakeFounder {
  fullName?: string | null
  email?: string | null
  phone?: string | null
}

interface IntakeFinancials {
  currency?: string | null
  lastFYRevenue?: number | null
  avgMonthlyRevenue?: number | null
  currentCashBalance?: number | null
  stage?: string | null
  notes?: string | null
}

interface IntakeEmailData {
  id?: string | number
  ventureName_en?: string | null
  ventureName_km?: string | null
  country?: string | null
  description_en?: string | null
  description_km?: string | null
  impactAreas?: string[] | null
  founders?: IntakeFounder[] | null
  financials?: IntakeFinancials | null
  triageTrack?: string | null
  triageRationale?: string | null
  disabilityFlag?: boolean | null
}

class EmailService {
  private transporter: Transporter | null = null
  private fromEmail: string
  private fromName: string

  constructor() {
    this.fromEmail = process.env.SMTP_FROM_EMAIL || process.env.EMAILJS_REPLY_TO || 'noreply@miv-ventures.com'
    this.fromName = 'Mekong Inclusive Ventures'
    this.initializeTransporter()
  }

  private initializeTransporter() {
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = parseInt(process.env.SMTP_PORT || '587')
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('SMTP configuration missing. Email sending will be disabled.')
      console.log('Required environment variables:')
      console.log('- SMTP_HOST:', smtpHost ? 'SET' : 'MISSING')
      console.log('- SMTP_USER:', smtpUser ? 'SET' : 'MISSING')
      console.log('- SMTP_PASS:', smtpPass ? 'SET' : 'MISSING')
      return
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })

      console.log('Email service initialized successfully')
      console.log('- SMTP Host:', smtpHost)
      console.log('- SMTP Port:', smtpPort)
      console.log('- From Email:', this.fromEmail)
    } catch (error) {
      console.error('Failed to initialize email service:', error)
    }
  }

  private isConfigured(): boolean {
    return this.transporter !== null
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  private formatValue(value: unknown): string {
    if (value === undefined || value === null || value === '') return 'Not provided'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'Not provided'
    return String(value)
  }

  private getVentureDisplayName(data: IntakeEmailData): string {
    return data.ventureName_en || data.ventureName_km || 'your venture application'
  }

  private generateIntakeFounderConfirmationText(data: IntakeEmailData): string {
    const ventureName = this.getVentureDisplayName(data)

    return `
Intake submission received

Thank you for submitting your intake application for ${ventureName}.

Our team has received your submission and will review the information provided. We will contact you if we need any additional details.

Best regards,
The Mekong Inclusive Ventures Team
    `.trim()
  }

  private generateIntakeFounderConfirmationHTML(data: IntakeEmailData): string {
    const ventureName = this.escapeHtml(this.getVentureDisplayName(data))

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Intake submission received</h2>
        <p>Thank you for submitting your intake application for <strong>${ventureName}</strong>.</p>
        <p>Our team has received your submission and will review the information provided. We will contact you if we need any additional details.</p>
        <p>Best regards,<br><strong>The Mekong Inclusive Ventures Team</strong></p>
      </div>
    `
  }

  private generateIntakeAdminNotificationText(data: IntakeEmailData): string {
    const primaryFounder = data.founders?.[0]
    const financials = data.financials

    return `
New intake submission received

Founder: ${this.formatValue(primaryFounder?.fullName)}
Founder email: ${this.formatValue(primaryFounder?.email)}
Venture/Application: ${this.getVentureDisplayName(data)}
Country: ${this.formatValue(data.country)}
Impact areas: ${this.formatValue(data.impactAreas)}
Triage track: ${this.formatValue(data.triageTrack)}
Disability flag: ${this.formatValue(data.disabilityFlag)}
Currency: ${this.formatValue(financials?.currency)}
Last FY revenue: ${this.formatValue(financials?.lastFYRevenue)}
Average monthly revenue: ${this.formatValue(financials?.avgMonthlyRevenue)}
Current cash balance: ${this.formatValue(financials?.currentCashBalance)}
Financial stage: ${this.formatValue(financials?.stage)}
Intake ID: ${this.formatValue(data.id)}

Description:
${this.formatValue(data.description_en || data.description_km)}

Triage rationale:
${this.formatValue(data.triageRationale)}
    `.trim()
  }

  private generateIntakeAdminNotificationHTML(data: IntakeEmailData): string {
    const primaryFounder = data.founders?.[0]
    const financials = data.financials
    const rows: [string, unknown][] = [
      ['Founder', primaryFounder?.fullName],
      ['Founder email', primaryFounder?.email],
      ['Venture/Application', this.getVentureDisplayName(data)],
      ['Country', data.country],
      ['Impact areas', data.impactAreas],
      ['Triage track', data.triageTrack],
      ['Disability flag', data.disabilityFlag],
      ['Currency', financials?.currency],
      ['Last FY revenue', financials?.lastFYRevenue],
      ['Average monthly revenue', financials?.avgMonthlyRevenue],
      ['Current cash balance', financials?.currentCashBalance],
      ['Financial stage', financials?.stage],
      ['Intake ID', data.id],
    ]

    const tableRows = rows
      .map(([label, value]) => {
        return `
          <tr>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">${this.escapeHtml(label)}</th>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${this.escapeHtml(this.formatValue(value))}</td>
          </tr>
        `
      })
      .join('')

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>New intake submission received</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
          <tbody>${tableRows}</tbody>
        </table>
        <h3>Description</h3>
        <p>${this.escapeHtml(this.formatValue(data.description_en || data.description_km))}</p>
        <h3>Triage rationale</h3>
        <p>${this.escapeHtml(this.formatValue(data.triageRationale))}</p>
      </div>
    `
  }

  private generateWelcomeEmailHTML(data: WelcomeEmailData): string {
    const { firstName, ventureName, position } = data
    const loginUrl = process.env.NEXT_PUBLIC_SITE_URL 
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/login`
      : 'http://localhost:3000/login'

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Mekong Inclusive Ventures</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #0ea5e9, #10b981); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 0 20px; }
        .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #0284c7; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; margin: 20px -20px -20px -20px; }
        .highlight { background: #f0f9ff; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Mekong Inclusive Ventures!</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${firstName}! 👋</h2>
          
          <p>Welcome to <strong>Mekong Inclusive Ventures</strong>! We're thrilled to have you join our community of changemakers who are building a more inclusive future for Southeast Asia.</p>
          
          ${ventureName ? `
          <div class="highlight">
            <p><strong>Your Venture:</strong> ${ventureName}</p>
            ${position ? `<p><strong>Your Role:</strong> ${position}</p>` : ''}
          </div>
          ` : ''}
          
          <h3>What's Next?</h3>
          <ul>
            <li>🔑 <strong>Login to your account</strong> using the button below</li>
            <li>📋 <strong>Complete your venture profile</strong> if you haven't already</li>
            <li>🤝 <strong>Connect with our team</strong> and other founders</li>
            <li>🚀 <strong>Access resources</strong> to help grow your venture</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" class="button">Login to Your Account</a>
          </div>
          
          <p>If you have any questions or need assistance, don't hesitate to reach out to our team. We're here to support you every step of the way!</p>
          
          <p>Best regards,<br>
          <strong>The Mekong Inclusive Ventures Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This email was sent to ${data.userEmail}</p>
          <p>Mekong Inclusive Ventures | Building Inclusive Futures</p>
        </div>
      </div>
    </body>
    </html>
    `
  }

  private generateWelcomeEmailText(data: WelcomeEmailData): string {
    const { firstName, ventureName, position } = data
    const loginUrl = process.env.NEXT_PUBLIC_SITE_URL 
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/login`
      : 'http://localhost:3000/login'

    return `
Hi ${firstName}!

Welcome to Mekong Inclusive Ventures! We're thrilled to have you join our community of changemakers who are building a more inclusive future for Southeast Asia.

${ventureName ? `Your Venture: ${ventureName}` : ''}
${position ? `Your Role: ${position}` : ''}

What's Next?
• Login to your account: ${loginUrl}
• Complete your venture profile if you haven't already
• Connect with our team and other founders
• Access resources to help grow your venture

If you have any questions or need assistance, don't hesitate to reach out to our team. We're here to support you every step of the way!

Best regards,
The Mekong Inclusive Ventures Team

---
This email was sent to ${data.userEmail}
Mekong Inclusive Ventures | Building Inclusive Futures
    `.trim()
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Email service not configured - skipping welcome email')
      return false
    }

    try {
      console.log(`Sending welcome email to ${data.userEmail}`)

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: data.userEmail,
        subject: `Welcome to Mekong Inclusive Ventures, ${data.firstName}!`,
        text: this.generateWelcomeEmailText(data),
        html: this.generateWelcomeEmailHTML(data),
      }

      const result = await this.transporter!.sendMail(mailOptions)
      console.log('Welcome email sent successfully:', result.messageId)
      return true
    } catch (error) {
      console.error('Failed to send welcome email:', error)
      return false
    }
  }

  async sendTestEmail(data: TestEmailData): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Email service not configured - skipping test email')
      return false
    }

    try {
      console.log(`Sending test email to ${data.userEmail}`)

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: data.userEmail,
        subject: 'Test Email from Mekong Inclusive Ventures',
        text: `Hi ${data.userName}!\n\nThis is a test email from Mekong Inclusive Ventures.\n\nVenture: ${data.ventureName}\n\nIf you received this email, the email service is working correctly!\n\nBest regards,\nMekong Inclusive Ventures Team`,
        html: `
          <h2>Hi ${data.userName}!</h2>
          <p>This is a test email from <strong>Mekong Inclusive Ventures</strong>.</p>
          <p><strong>Venture:</strong> ${data.ventureName}</p>
          <p>If you received this email, the email service is working correctly! ✅</p>
          <p>Best regards,<br><strong>Mekong Inclusive Ventures Team</strong></p>
        `,
      }

      const result = await this.transporter!.sendMail(mailOptions)
      console.log('Test email sent successfully:', result.messageId)
      return true
    } catch (error) {
      console.error('Failed to send test email:', error)
      return false
    }
  }

  async sendIntakeConfirmationToFounder(
    founderEmail: string | undefined,
    ventureData: IntakeEmailData,
  ): Promise<boolean> {
    if (!founderEmail) {
      console.warn('Founder email missing - skipping intake confirmation email')
      return false
    }

    if (!this.isConfigured()) {
      console.warn('Email service not configured - skipping intake confirmation email')
      return false
    }

    try {
      console.log(`Sending intake confirmation email to ${founderEmail}`)

      const result = await this.transporter!.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: founderEmail,
        subject: 'Intake submission received',
        text: this.generateIntakeFounderConfirmationText(ventureData),
        html: this.generateIntakeFounderConfirmationHTML(ventureData),
      })

      console.log('Intake confirmation email sent successfully:', result.messageId)
      return true
    } catch (error) {
      console.error('Failed to send intake confirmation email:', error)
      return false
    }
  }

  async sendIntakeNotificationToAdmin(
    adminEmail: string | undefined,
    ventureData: IntakeEmailData,
  ): Promise<boolean> {
    if (!adminEmail) {
      console.warn('ADMIN_NOTIFICATION_EMAIL missing - skipping intake admin notification email')
      return false
    }

    if (!this.isConfigured()) {
      console.warn('Email service not configured - skipping intake admin notification email')
      return false
    }

    try {
      console.log(`Sending intake admin notification email to ${adminEmail}`)

      const result = await this.transporter!.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: adminEmail,
        subject: 'New intake submission received',
        text: this.generateIntakeAdminNotificationText(ventureData),
        html: this.generateIntakeAdminNotificationHTML(ventureData),
      })

      console.log('Intake admin notification email sent successfully:', result.messageId)
      return true
    } catch (error) {
      console.error('Failed to send intake admin notification email:', error)
      return false
    }
  }

  async sendPasswordResetEmail(userEmail: string, resetToken: string) {
  if (!this.isConfigured()) {
    console.log("SMTP not configured, cannot send reset email.");
    console.log("Reset token:", resetToken);
    return { success: false, message: "Email service not configured" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`;

  const subject = "Reset your password";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password.</p>
      <p>Click the button below to reset it:</p>
      <p>
        <a href="${resetLink}"
           style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
      </p>
      <p style="font-size: 12px; color: #555;">
        If you did not request this, you can ignore this email.
      </p>
    </div>
  `;

  try {
    await this.transporter!.sendMail({
      from: this.fromEmail,
      to: userEmail,
      subject,
      html,
    });

    console.log("✅ Password reset email sent to:", userEmail);
    return { success: true, message: "Reset email sent", resetLink };
  } catch (error) {
    console.error("❌ Failed to send reset email:", error);
    return { success: false, message: "Failed to send reset email" };
  }
}


  getConfigurationStatus(): { configured: boolean; missing: string[] } {
    const missing: string[] = []
    
    if (!process.env.SMTP_HOST) missing.push('SMTP_HOST')
    if (!process.env.SMTP_USER) missing.push('SMTP_USER')
    if (!process.env.SMTP_PASS) missing.push('SMTP_PASS')

    return {
      configured: missing.length === 0,
      missing
    }
  }
}

// Export singleton instance
export const emailService = new EmailService()

// Export types
export type { WelcomeEmailData, TestEmailData, IntakeEmailData }
