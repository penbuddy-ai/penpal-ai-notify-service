import { IsString, IsEmail, IsOptional, IsIn, IsNumber, IsDateString } from 'class-validator';

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

export class SendSubscriptionConfirmationEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsIn(['monthly', 'yearly'])
  plan: 'monthly' | 'yearly';

  @IsString()
  @IsIn(['trial', 'active'])
  status: 'trial' | 'active';

  @IsOptional()
  @IsDateString()
  trialEnd?: string;

  @IsOptional()
  @IsDateString()
  nextBillingDate?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class NotificationResponseDto {
  success: boolean;
  message: string;
  timestamp: Date;
} 