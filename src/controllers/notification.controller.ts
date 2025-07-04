import { 
  Controller, 
  Post, 
  Body, 
  Logger, 
  HttpCode, 
  HttpStatus, 
  UseGuards,
  Get 
} from '@nestjs/common';
import { EmailService } from '../services/email.service';
import { SendWelcomeEmailDto, NotificationResponseDto } from '../dto/notification.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';

@Controller('notifications')
@UseGuards(ApiKeyGuard)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly emailService: EmailService) {}

  @Post('welcome-email')
  @HttpCode(HttpStatus.OK)
  async sendWelcomeEmail(@Body() sendWelcomeEmailDto: SendWelcomeEmailDto): Promise<NotificationResponseDto> {
    this.logger.log(`Received welcome email request for: ${sendWelcomeEmailDto.email}`);

    try {
      const success = await this.emailService.sendWelcomeEmail({
        email: sendWelcomeEmailDto.email,
        firstName: sendWelcomeEmailDto.firstName,
        lastName: sendWelcomeEmailDto.lastName,
        provider: sendWelcomeEmailDto.provider,
      });

      if (success) {
        this.logger.log(`Welcome email sent successfully to: ${sendWelcomeEmailDto.email}`);
        return {
          success: true,
          message: 'Welcome email sent successfully',
          timestamp: new Date(),
        };
      } else {
        this.logger.error(`Failed to send welcome email to: ${sendWelcomeEmailDto.email}`);
        return {
          success: false,
          message: 'Failed to send welcome email',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      this.logger.error(`Error processing welcome email request: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<{ status: string; email_service: string; timestamp: Date }> {
    this.logger.log('Health check requested');
    
    const emailServiceHealthy = await this.emailService.verifyConnection();
    
    return {
      status: emailServiceHealthy ? 'healthy' : 'degraded',
      email_service: emailServiceHealthy ? 'connected' : 'disconnected',
      timestamp: new Date(),
    };
  }
} 