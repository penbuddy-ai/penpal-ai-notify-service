import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

import { SubscriptionConfirmationEmailData, TemplateService, WelcomeEmailData } from "../utils/template.service";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly emailConfig: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: TemplateService,
  ) {
    this.emailConfig = this.configService.get("email");
    this.createTransporter();
  }

  private createTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        auth: {
          user: this.emailConfig.auth.user,
          pass: this.emailConfig.auth.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.logger.log(`Email transporter configured for ${this.emailConfig.host}:${this.emailConfig.port}`);
    }
    catch (error) {
      this.logger.error(`Failed to create email transporter: ${error.message}`);
      throw error;
    }
  }

  async sendWelcomeEmail(userData: WelcomeEmailData): Promise<boolean> {
    try {
      this.logger.log(`Sending welcome email to ${userData.email}`);

      // Check if we're in test mode (no SMTP configured)
      if (!this.emailConfig.auth.user || !this.emailConfig.auth.pass) {
        this.logger.warn("SMTP not configured - running in TEST MODE");
        this.logTestWelcomeEmail(userData);
        return true;
      }

      const template = await this.templateService.getWelcomeEmailTemplate(userData);

      const mailOptions = {
        from: {
          name: this.emailConfig.from.name,
          address: this.emailConfig.from.address,
        },
        to: userData.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent successfully to ${userData.email}. Message ID: ${info.messageId}`);

      return true;
    }
    catch (error) {
      this.logger.error(`Failed to send welcome email to ${userData.email}: ${error.message}`, error.stack);
      return false;
    }
  }

  async sendSubscriptionConfirmationEmail(subscriptionData: SubscriptionConfirmationEmailData): Promise<boolean> {
    try {
      this.logger.log(`Sending subscription confirmation email to ${subscriptionData.email}`);

      // Check if we're in test mode (no SMTP configured)
      if (!this.emailConfig.auth.user || !this.emailConfig.auth.pass) {
        this.logger.warn("SMTP not configured - running in TEST MODE");
        this.logTestSubscriptionEmail(subscriptionData);
        return true;
      }

      const template = await this.templateService.getSubscriptionConfirmationEmailTemplate(subscriptionData);

      const mailOptions = {
        from: {
          name: this.emailConfig.from.name,
          address: this.emailConfig.from.address,
        },
        to: subscriptionData.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Subscription confirmation email sent successfully to ${subscriptionData.email}. Message ID: ${info.messageId}`);

      return true;
    }
    catch (error) {
      this.logger.error(`Failed to send subscription confirmation email to ${subscriptionData.email}: ${error.message}`, error.stack);
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log("Email transporter connection verified successfully");
      return true;
    }
    catch (error) {
      this.logger.error(`Email transporter verification failed: ${error.message}`);
      return false;
    }
  }

  private logTestWelcomeEmail(userData: WelcomeEmailData): void {
    this.logger.log(`
📧 EMAIL DE TEST - BIENVENUE
=====================================
À: ${userData.email}
Nom: ${userData.firstName} ${userData.lastName}
Provider: ${userData.provider}
=====================================

🎉 Bienvenue ${userData.firstName} !

Votre compte Penpal AI a été créé avec succès via ${userData.provider}.

Vous pouvez maintenant :
• 💬 Converser avec des IA spécialisées
• 📚 Améliorer vos compétences linguistiques  
• 🌍 Découvrir de nouvelles cultures
• 📈 Suivre vos progrès

Accédez à votre tableau de bord : ${this.emailConfig.templates.baseUrl}/onboarding

=====================================
✅ Email de test affiché dans les logs
    `);
  }

  private logTestSubscriptionEmail(subscriptionData: SubscriptionConfirmationEmailData): void {
    this.logger.log(`
📧 EMAIL DE TEST - ABONNEMENT
==============================================
À: ${subscriptionData.email}
Nom: ${subscriptionData.firstName} ${subscriptionData.lastName}
Plan: ${subscriptionData.plan}
Status: ${subscriptionData.status}
==============================================

${subscriptionData.status === "trial" ? "🎉 Période d'essai commencée !" : "🎉 Abonnement confirmé !"}

Bonjour ${subscriptionData.firstName} !

${subscriptionData.status === "trial"
    ? `Votre période d'essai gratuite Penpal AI a commencé.
Plan: Essai ${subscriptionData.plan === "monthly" ? "Mensuel" : "Annuel"}
${subscriptionData.trialEnd ? `Fin: ${subscriptionData.trialEnd.toLocaleDateString("fr-FR")}` : ""}
Accès: Toutes les fonctionnalités premium`
    : `Votre abonnement Penpal AI est maintenant actif !
Plan: ${subscriptionData.plan === "monthly" ? "Mensuel" : "Annuel"}
${subscriptionData.amount ? `Montant: ${(subscriptionData.amount / 100).toFixed(2)} ${subscriptionData.currency?.toUpperCase() || "EUR"}` : ""}
${subscriptionData.nextBillingDate ? `Prochaine facturation: ${subscriptionData.nextBillingDate.toLocaleDateString("fr-FR")}` : ""}`
}

Accédez à Penpal AI : ${this.emailConfig.templates.baseUrl}

==============================================
✅ Email de test affiché dans les logs
    `);
  }
}
