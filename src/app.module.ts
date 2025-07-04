import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailService } from './services/email.service';
import { TemplateService } from './utils/template.service';
import { NotificationController } from './controllers/notification.controller';
import { ApiKeyGuard } from './guards/api-key.guard';
import emailConfig from './config/email.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [emailConfig],
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  controllers: [AppController, NotificationController],
  providers: [AppService, EmailService, TemplateService, ApiKeyGuard],
})
export class AppModule {}
