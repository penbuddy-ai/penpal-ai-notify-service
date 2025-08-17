import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as handlebars from "handlebars";
import * as fs from "node:fs";
import * as path from "node:path";

export type WelcomeEmailData = {
  email: string;
  firstName: string;
  lastName: string;
  provider: string;
};

export type SubscriptionConfirmationEmailData = {
  email: string;
  firstName: string;
  lastName: string;
  plan: "monthly" | "yearly";
  status: "trial" | "active";
  trialEnd?: Date;
  nextBillingDate?: Date;
  amount?: number;
  currency?: string;
};

export type CompiledTemplate = {
  html: string;
  text: string;
  subject: string;
};

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templateCache = new Map<string, { html: HandlebarsTemplateDelegate; text: HandlebarsTemplateDelegate }>();
  private readonly emailConfig: any;

  constructor(private readonly configService: ConfigService) {
    this.emailConfig = this.configService.get("email");
  }

  async getWelcomeEmailTemplate(userData: WelcomeEmailData): Promise<CompiledTemplate> {
    const templates = await this.loadTemplates("welcome");

    const templateData = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      fullName: `${userData.firstName} ${userData.lastName}`,
      provider: this.getProviderDisplayName(userData.provider),
      email: userData.email,
      baseUrl: this.emailConfig.templates.baseUrl,
      year: new Date().getFullYear(),
    };

    return {
      html: templates.html(templateData),
      text: templates.text(templateData),
      subject: "Bienvenue dans Penpal AI ! 🎉",
    };
  }

  async getSubscriptionConfirmationEmailTemplate(subscriptionData: SubscriptionConfirmationEmailData): Promise<CompiledTemplate> {
    const templates = await this.loadTemplates("subscription");

    const templateData = {
      firstName: subscriptionData.firstName,
      lastName: subscriptionData.lastName,
      fullName: `${subscriptionData.firstName} ${subscriptionData.lastName}`,
      plan: subscriptionData.plan === "monthly" ? "Mensuel" : "Annuel",
      planType: subscriptionData.plan,
      status: subscriptionData.status,
      isTrialActive: subscriptionData.status === "trial",
      trialEnd: subscriptionData.trialEnd ? subscriptionData.trialEnd.toLocaleDateString("fr-FR") : null,
      nextBillingDate: subscriptionData.nextBillingDate ? subscriptionData.nextBillingDate.toLocaleDateString("fr-FR") : null,
      amount: subscriptionData.amount ? (subscriptionData.amount / 100).toFixed(2) : null,
      currency: subscriptionData.currency?.toUpperCase() || "EUR",
      baseUrl: this.emailConfig.templates.baseUrl,
      year: new Date().getFullYear(),
    };

    const subject = subscriptionData.status === "trial"
      ? "Votre période d'essai Penpal AI a commencé ! 🎉"
      : "Confirmation de votre abonnement Penpal AI 🎉";

    return {
      html: templates.html(templateData),
      text: templates.text(templateData),
      subject,
    };
  }

  private async loadTemplates(templateName: string): Promise<{ html: HandlebarsTemplateDelegate; text: HandlebarsTemplateDelegate }> {
    const cacheKey = templateName;

    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    try {
      const templateDir = path.join(process.cwd(), "src", "templates", templateName);

      const htmlPath = path.join(templateDir, `${templateName}.html.hbs`);
      const textPath = path.join(templateDir, `${templateName}.text.hbs`);

      const htmlContent = await fs.promises.readFile(htmlPath, "utf-8");
      const textContent = await fs.promises.readFile(textPath, "utf-8");

      const compiledTemplates = {
        html: handlebars.compile(htmlContent),
        text: handlebars.compile(textContent),
      };

      this.templateCache.set(cacheKey, compiledTemplates);
      this.logger.log(`Templates loaded and cached for: ${templateName}`);

      return compiledTemplates;
    }
    catch (error) {
      this.logger.error(`Failed to load templates for ${templateName}: ${error.message}`);
      throw new Error(`Template loading failed: ${templateName}`);
    }
  }

  private getProviderDisplayName(provider: string): string {
    const providers = {
      google: "Google",
      facebook: "Facebook",
      apple: "Apple",
      github: "GitHub",
    };
    return providers[provider] || provider;
  }

  /**
   * Clear template cache - useful for development or template updates
   */
  clearCache(): void {
    this.templateCache.clear();
    this.logger.log("Template cache cleared");
  }

  /**
   * Get template cache status
   */
  getCacheStatus(): { size: number; keys: string[] } {
    return {
      size: this.templateCache.size,
      keys: Array.from(this.templateCache.keys()),
    };
  }
}
