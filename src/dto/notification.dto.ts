import { IsString, IsEmail, IsOptional, IsIn } from 'class-validator';

export class SendWelcomeEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsIn(['google', 'facebook', 'apple', 'github'])
  provider: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class NotificationResponseDto {
  success: boolean;
  message: string;
  timestamp: Date;
} 