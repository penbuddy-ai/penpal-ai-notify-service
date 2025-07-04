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
} 