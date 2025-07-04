import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';

export interface WelcomeEmailData {
  email: string;
  firstName: string;
  lastName: string;
  provider: string;
}

export interface SubscriptionConfirmationEmailData {
  email: string;
  firstName: string;
  lastName: string;
  plan: 'monthly' | 'yearly';
  status: 'trial' | 'active';
  trialEnd?: Date;
  nextBillingDate?: Date;
  amount?: number;
  currency?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly emailConfig: any;

  constructor(private readonly configService: ConfigService) {
    this.emailConfig = this.configService.get('email');
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
    } catch (error) {
      this.logger.error(`Failed to create email transporter: ${error.message}`);
      throw error;
    }
  }

  async sendWelcomeEmail(userData: WelcomeEmailData): Promise<boolean> {
    try {
      this.logger.log(`Sending welcome email to ${userData.email}`);

      // Check if we're in test mode (no SMTP configured)
      if (!this.emailConfig.auth.user || !this.emailConfig.auth.pass) {
        this.logger.warn('SMTP not configured - running in TEST MODE');
        this.logTestEmail(userData);
        return true;
      }

      const htmlTemplate = this.getWelcomeEmailTemplate();
      const textTemplate = this.getWelcomeEmailTextTemplate();

      // Compile templates with handlebars
      const compiledHtml = handlebars.compile(htmlTemplate);
      const compiledText = handlebars.compile(textTemplate);

      const templateData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: `${userData.firstName} ${userData.lastName}`,
        provider: this.getProviderDisplayName(userData.provider),
        baseUrl: this.emailConfig.templates.baseUrl,
        year: new Date().getFullYear(),
      };

      const mailOptions = {
        from: {
          name: this.emailConfig.from.name,
          address: this.emailConfig.from.address,
        },
        to: userData.email,
        subject: 'Bienvenue dans Penpal AI ! 🎉',
        text: compiledText(templateData),
        html: compiledHtml(templateData),
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent successfully to ${userData.email}. Message ID: ${info.messageId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${userData.email}: ${error.message}`, error.stack);
      return false;
    }
  }

  async sendSubscriptionConfirmationEmail(subscriptionData: SubscriptionConfirmationEmailData): Promise<boolean> {
    try {
      this.logger.log(`Sending subscription confirmation email to ${subscriptionData.email}`);

      // Check if we're in test mode (no SMTP configured)
      if (!this.emailConfig.auth.user || !this.emailConfig.auth.pass) {
        this.logger.warn('SMTP not configured - running in TEST MODE');
        this.logTestSubscriptionEmail(subscriptionData);
        return true;
      }

      const htmlTemplate = this.getSubscriptionConfirmationEmailTemplate();
      const textTemplate = this.getSubscriptionConfirmationEmailTextTemplate();

      // Compile templates with handlebars
      const compiledHtml = handlebars.compile(htmlTemplate);
      const compiledText = handlebars.compile(textTemplate);

      const templateData = {
        firstName: subscriptionData.firstName,
        lastName: subscriptionData.lastName,
        fullName: `${subscriptionData.firstName} ${subscriptionData.lastName}`,
        plan: subscriptionData.plan === 'monthly' ? 'Mensuel' : 'Annuel',
        planType: subscriptionData.plan,
        status: subscriptionData.status,
        isTrialActive: subscriptionData.status === 'trial',
        trialEnd: subscriptionData.trialEnd ? subscriptionData.trialEnd.toLocaleDateString('fr-FR') : null,
        nextBillingDate: subscriptionData.nextBillingDate ? subscriptionData.nextBillingDate.toLocaleDateString('fr-FR') : null,
        amount: subscriptionData.amount ? (subscriptionData.amount / 100).toFixed(2) : null,
        currency: subscriptionData.currency?.toUpperCase() || 'EUR',
        baseUrl: this.emailConfig.templates.baseUrl,
        year: new Date().getFullYear(),
      };

      const subject = subscriptionData.status === 'trial' 
        ? 'Votre période d\'essai Penpal AI a commencé ! 🎉'
        : 'Confirmation de votre abonnement Penpal AI 🎉';

      const mailOptions = {
        from: {
          name: this.emailConfig.from.name,
          address: this.emailConfig.from.address,
        },
        to: subscriptionData.email,
        subject,
        text: compiledText(templateData),
        html: compiledHtml(templateData),
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Subscription confirmation email sent successfully to ${subscriptionData.email}. Message ID: ${info.messageId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send subscription confirmation email to ${subscriptionData.email}: ${error.message}`, error.stack);
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email transporter connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error(`Email transporter verification failed: ${error.message}`);
      return false;
    }
  }

  private getProviderDisplayName(provider: string): string {
    const providers = {
      google: 'Google',
      facebook: 'Facebook',
      apple: 'Apple',
      github: 'GitHub',
    };
    return providers[provider] || provider;
  }

  private getWelcomeEmailTemplate(): string {
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenue dans Penpal AI</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 32px;
                font-weight: bold;
                color: #4a90e2;
                margin-bottom: 10px;
            }
            .welcome-title {
                color: #2c3e50;
                font-size: 28px;
                margin-bottom: 20px;
            }
            .content {
                margin-bottom: 30px;
            }
            .highlight {
                background-color: #e8f4f8;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #4a90e2;
                margin: 20px 0;
            }
            .cta-button {
                display: inline-block;
                background-color: #4a90e2;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 14px;
                color: #666;
                text-align: center;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                color: #4a90e2;
                text-decoration: none;
                margin: 0 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🤖 Penpal AI</div>
                <h1 class="welcome-title">Bienvenue {{fullName}} ! 🎉</h1>
            </div>
            
            <div class="content">
                <p>Félicitations ! Votre compte Penpal AI a été créé avec succès via {{provider}}.</p>
                
                <div class="highlight">
                    <p><strong>🚀 Vous êtes maintenant prêt(e) à :</strong></p>
                    <ul>
                        <li>💬 Converser avec des IA spécialisées dans différentes langues</li>
                        <li>📚 Améliorer vos compétences linguistiques de manière interactive</li>
                        <li>🌍 Découvrir de nouvelles cultures à travers nos personnages IA</li>
                        <li>📈 Suivre vos progrès en temps réel</li>
                    </ul>
                </div>
                
                <p>Commencez dès maintenant votre aventure d'apprentissage des langues :</p>
                
                <center>
                    <a href="{{baseUrl}}/onboarding" class="cta-button">Accéder à mon tableau de bord</a>
                </center>
                
                <p>Si vous avez des questions, notre équipe de support est là pour vous aider !</p>
            </div>
            
            <div class="footer">
                <div class="social-links">
                    <a href="{{baseUrl}}/support">Support</a> |
                    <a href="{{baseUrl}}/about">À propos</a> |
                    <a href="{{baseUrl}}/privacy">Confidentialité</a>
                </div>
                <p>© {{year}} Penpal AI. Tous droits réservés.</p>
                <p><small>Cet email a été envoyé à {{email}} suite à la création de votre compte.</small></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getWelcomeEmailTextTemplate(): string {
    return `
Bienvenue dans Penpal AI, {{fullName}} ! 🎉

Félicitations ! Votre compte Penpal AI a été créé avec succès via {{provider}}.

🚀 Vous êtes maintenant prêt(e) à :
• 💬 Converser avec des IA spécialisées dans différentes langues
• 📚 Améliorer vos compétences linguistiques de manière interactive
• 🌍 Découvrir de nouvelles cultures à travers nos personnages IA
• 📈 Suivre vos progrès en temps réel

Commencez dès maintenant : {{baseUrl}}/dashboard

Si vous avez des questions, notre équipe de support est là pour vous aider !

Support: {{baseUrl}}/support
À propos: {{baseUrl}}/about
Confidentialité: {{baseUrl}}/privacy

© {{year}} Penpal AI. Tous droits réservés.
Cet email a été envoyé à {{email}} suite à la création de votre compte.
    `;
  }

  private logTestEmail(userData: WelcomeEmailData): void {
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

Accédez à votre tableau de bord : ${this.emailConfig.templates.baseUrl}/profile

=====================================
✅ Email de test affiché dans les logs
    `);
  }

  private getSubscriptionConfirmationEmailTemplate(): string {
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmation d'abonnement Penpal AI</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 32px;
                font-weight: bold;
                color: #4a90e2;
                margin-bottom: 10px;
            }
            .title {
                color: #2c3e50;
                font-size: 28px;
                margin-bottom: 20px;
            }
            .highlight {
                background-color: #e8f4f8;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #4a90e2;
                margin: 20px 0;
            }
            .plan-badge {
                display: inline-block;
                background-color: #4a90e2;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 14px;
            }
            .trial-badge {
                display: inline-block;
                background-color: #f39c12;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 14px;
            }
            .cta-button {
                display: inline-block;
                background-color: #4a90e2;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 14px;
                color: #666;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🤖 Penpal AI</div>
                <h1 class="title">
                    {{#if isTrialActive}}
                        Votre période d'essai a commencé !
                    {{else}}
                        Abonnement confirmé !
                    {{/if}}
                </h1>
            </div>
            
            <div class="content">
                <p>Bonjour {{fullName}},</p>
                
                {{#if isTrialActive}}
                    <p>🎉 Excellente nouvelle ! Votre période d'essai gratuite de Penpal AI a commencé.</p>
                    
                    <div class="highlight">
                        <h3>📅 Détails de votre essai :</h3>
                        <p><strong>Plan :</strong> <span class="trial-badge">Essai {{plan}}</span></p>
                        {{#if trialEnd}}
                        <p><strong>Fin de l'essai :</strong> {{trialEnd}}</p>
                        {{/if}}
                        <p><strong>Accès :</strong> Toutes les fonctionnalités premium</p>
                    </div>
                    
                    <p>Profitez pleinement de toutes nos fonctionnalités pendant votre période d'essai. Aucun frais ne sera prélevé jusqu'à la fin de cette période.</p>
                {{else}}
                    <p>🎉 Votre abonnement Penpal AI est maintenant actif ! Merci de nous faire confiance.</p>
                    
                    <div class="highlight">
                        <h3>💳 Détails de votre abonnement :</h3>
                        <p><strong>Plan :</strong> <span class="plan-badge">{{plan}}</span></p>
                        {{#if amount}}
                        <p><strong>Montant :</strong> {{amount}} {{currency}}</p>
                        {{/if}}
                        {{#if nextBillingDate}}
                        <p><strong>Prochaine facturation :</strong> {{nextBillingDate}}</p>
                        {{/if}}
                    </div>
                {{/if}}
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{baseUrl}}" class="cta-button">Accéder à Penpal AI</a>
                </div>
                
                <p>Si vous avez des questions, n'hésitez pas à nous contacter. Notre équipe est là pour vous accompagner !</p>
            </div>
            
            <div class="footer">
                <p>Merci de faire partie de la communauté Penpal AI ! 🚀</p>
                <p>&copy; {{year}} Penpal AI. Tous droits réservés.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getSubscriptionConfirmationEmailTextTemplate(): string {
    return `
🤖 Penpal AI - {{#if isTrialActive}}Période d'essai commencée{{else}}Abonnement confirmé{{/if}}

Bonjour {{fullName}},

{{#if isTrialActive}}
🎉 Excellente nouvelle ! Votre période d'essai gratuite de Penpal AI a commencé.

Détails de votre essai :
- Plan : Essai {{plan}}
{{#if trialEnd}}
- Fin de l'essai : {{trialEnd}}
{{/if}}
- Accès : Toutes les fonctionnalités premium

Profitez pleinement de toutes nos fonctionnalités pendant votre période d'essai. Aucun frais ne sera prélevé jusqu'à la fin de cette période.
{{else}}
🎉 Votre abonnement Penpal AI est maintenant actif ! Merci de nous faire confiance.

Détails de votre abonnement :
- Plan : {{plan}}
{{#if amount}}
- Montant : {{amount}} {{currency}}
{{/if}}
{{#if nextBillingDate}}
- Prochaine facturation : {{nextBillingDate}}
{{/if}}
{{/if}}

Accéder à Penpal AI : {{baseUrl}}

Si vous avez des questions, n'hésitez pas à nous contacter. Notre équipe est là pour vous accompagner !

Merci de faire partie de la communauté Penpal AI ! 🚀

© {{year}} Penpal AI. Tous droits réservés.
    `;
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

${subscriptionData.status === 'trial' ? '🎉 Période d\'essai commencée !' : '🎉 Abonnement confirmé !'}

Bonjour ${subscriptionData.firstName} !

${subscriptionData.status === 'trial' 
  ? `Votre période d'essai gratuite Penpal AI a commencé.
Plan: Essai ${subscriptionData.plan === 'monthly' ? 'Mensuel' : 'Annuel'}
${subscriptionData.trialEnd ? `Fin: ${subscriptionData.trialEnd.toLocaleDateString('fr-FR')}` : ''}
Accès: Toutes les fonctionnalités premium`
  : `Votre abonnement Penpal AI est maintenant actif !
Plan: ${subscriptionData.plan === 'monthly' ? 'Mensuel' : 'Annuel'}
${subscriptionData.amount ? `Montant: ${(subscriptionData.amount / 100).toFixed(2)} ${subscriptionData.currency?.toUpperCase() || 'EUR'}` : ''}
${subscriptionData.nextBillingDate ? `Prochaine facturation: ${subscriptionData.nextBillingDate.toLocaleDateString('fr-FR')}` : ''}`
}

Accédez à Penpal AI : ${this.emailConfig.templates.baseUrl}

==============================================
✅ Email de test affiché dans les logs
    `);
  }
} 