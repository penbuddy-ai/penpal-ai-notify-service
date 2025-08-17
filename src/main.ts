import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  const app = await NestFactory.create(AppModule);

  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: false,
  }));

  // Enable CORS if needed
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix("api/v1");

  // API Documentation
  const config = new DocumentBuilder()
    .setTitle("Penpal AI - Notification Service")
    .setDescription(`
      Service de notification pour l'application Penpal AI.
      
      ## Caractéristiques
      
      - **Notifications par email**: Envoi d'emails personnalisés
      - **Templates HTML**: Templates Handlebars pour les emails
      - **Authentification API**: Sécurisation par clé API
      - **Monitoring**: Health check et logging
      
      ## Authentification
      
      Ce service utilise une authentification par clé API:
      - x-api-key: Clé API pour l'authentification inter-services
      
      ## Configuration
      
      Consultez le fichier README.md pour plus d'informations.
    `)
    .setVersion("1.0.0")
    .setContact(
      "Penpal AI Team",
      "https://penpal.ai",
      "support@penpal.ai",
    )
    .setLicense(
      "MIT",
      "https://opensource.org/licenses/MIT",
    )
    .addApiKey(
      {
        type: "apiKey",
        name: "x-api-key",
        in: "header",
        description: "API key for service authentication",
      },
      "api-key",
    )
    .addTag("notifications", "Gestion des notifications")
    .addTag("health", "Monitoring et statut du service")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/v1/docs", app, document);

  const port = process.env.PORT ?? 3007;
  await app.listen(port);

  logger.log(`🚀 Notification service is running on port ${port}`);
  logger.log(`📧 Email service configured and ready`);
  logger.log(`📚 API documentation available at: http://localhost:${port}/api/v1/docs`);
}

bootstrap().catch((error) => {
  console.error("Failed to start notification service:", error);
  process.exit(1);
});
