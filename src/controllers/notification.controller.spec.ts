import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { SendSubscriptionConfirmationEmailDto, SendWelcomeEmailDto } from "../dto/notification.dto";
import { ApiKeyGuard } from "../guards/api-key.guard";
import { EmailService } from "../services/email.service";
import { NotificationController } from "./notification.controller";

describe("notificationController", () => {
  let controller: NotificationController;
  let emailService: jest.Mocked<EmailService>;

  const mockEmailService = {
    sendWelcomeEmail: jest.fn(),
    sendSubscriptionConfirmationEmail: jest.fn(),
    verifyConnection: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue("test-api-key"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        ApiKeyGuard,
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationController>(NotificationController);
    emailService = module.get(EmailService);

    // Mock logger to prevent console output during tests
    jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(Logger.prototype, "error").mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("sendWelcomeEmail", () => {
    const mockWelcomeEmailDto: SendWelcomeEmailDto = {
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      provider: "google",
      userId: "user123",
    };

    it("should send welcome email successfully", async () => {
      emailService.sendWelcomeEmail.mockResolvedValue(true);

      const result = await controller.sendWelcomeEmail(mockWelcomeEmailDto);

      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith({
        email: mockWelcomeEmailDto.email,
        firstName: mockWelcomeEmailDto.firstName,
        lastName: mockWelcomeEmailDto.lastName,
        provider: mockWelcomeEmailDto.provider,
      });
      expect(result).toEqual({
        success: true,
        message: "Welcome email sent successfully",
        timestamp: expect.any(Date),
      });
    });

    it("should handle email service failure", async () => {
      emailService.sendWelcomeEmail.mockResolvedValue(false);

      const result = await controller.sendWelcomeEmail(mockWelcomeEmailDto);

      expect(result).toEqual({
        success: false,
        message: "Failed to send welcome email",
        timestamp: expect.any(Date),
      });
    });

    it("should handle email service error", async () => {
      const errorMessage = "SMTP connection failed";
      emailService.sendWelcomeEmail.mockRejectedValue(new Error(errorMessage));

      const result = await controller.sendWelcomeEmail(mockWelcomeEmailDto);

      expect(result).toEqual({
        success: false,
        message: `Error: ${errorMessage}`,
        timestamp: expect.any(Date),
      });
    });

    it("should return timestamp within reasonable range", async () => {
      emailService.sendWelcomeEmail.mockResolvedValue(true);
      const beforeTime = new Date();

      const result = await controller.sendWelcomeEmail(mockWelcomeEmailDto);

      const afterTime = new Date();
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe("sendSubscriptionConfirmationEmail", () => {
    const mockSubscriptionEmailDto: SendSubscriptionConfirmationEmailDto = {
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      plan: "monthly",
      status: "active",
      trialEnd: "2024-02-15T00:00:00.000Z",
      nextBillingDate: "2024-02-15T00:00:00.000Z",
      amount: 999,
      currency: "EUR",
      userId: "user123",
    };

    it("should send subscription confirmation email successfully", async () => {
      emailService.sendSubscriptionConfirmationEmail.mockResolvedValue(true);

      const result = await controller.sendSubscriptionConfirmationEmail(mockSubscriptionEmailDto);

      expect(emailService.sendSubscriptionConfirmationEmail).toHaveBeenCalledWith({
        email: mockSubscriptionEmailDto.email,
        firstName: mockSubscriptionEmailDto.firstName,
        lastName: mockSubscriptionEmailDto.lastName,
        plan: mockSubscriptionEmailDto.plan,
        status: mockSubscriptionEmailDto.status,
        trialEnd: new Date(mockSubscriptionEmailDto.trialEnd!),
        nextBillingDate: new Date(mockSubscriptionEmailDto.nextBillingDate!),
        amount: mockSubscriptionEmailDto.amount,
        currency: mockSubscriptionEmailDto.currency,
      });
      expect(result).toEqual({
        success: true,
        message: "Subscription confirmation email sent successfully",
        timestamp: expect.any(Date),
      });
    });

    it("should handle optional date fields correctly", async () => {
      const dtoWithoutDates = {
        ...mockSubscriptionEmailDto,
        trialEnd: undefined,
        nextBillingDate: undefined,
      };
      emailService.sendSubscriptionConfirmationEmail.mockResolvedValue(true);

      await controller.sendSubscriptionConfirmationEmail(dtoWithoutDates);

      expect(emailService.sendSubscriptionConfirmationEmail).toHaveBeenCalledWith({
        email: dtoWithoutDates.email,
        firstName: dtoWithoutDates.firstName,
        lastName: dtoWithoutDates.lastName,
        plan: dtoWithoutDates.plan,
        status: dtoWithoutDates.status,
        trialEnd: undefined,
        nextBillingDate: undefined,
        amount: dtoWithoutDates.amount,
        currency: dtoWithoutDates.currency,
      });
    });

    it("should handle email service failure", async () => {
      emailService.sendSubscriptionConfirmationEmail.mockResolvedValue(false);

      const result = await controller.sendSubscriptionConfirmationEmail(mockSubscriptionEmailDto);

      expect(result).toEqual({
        success: false,
        message: "Failed to send subscription confirmation email",
        timestamp: expect.any(Date),
      });
    });

    it("should handle email service error", async () => {
      const errorMessage = "Template not found";
      emailService.sendSubscriptionConfirmationEmail.mockRejectedValue(new Error(errorMessage));

      const result = await controller.sendSubscriptionConfirmationEmail(mockSubscriptionEmailDto);

      expect(result).toEqual({
        success: false,
        message: `Error: ${errorMessage}`,
        timestamp: expect.any(Date),
      });
    });
  });

  describe("healthCheck", () => {
    it("should return healthy status when email service is connected", async () => {
      emailService.verifyConnection.mockResolvedValue(true);

      const result = await controller.healthCheck();

      expect(emailService.verifyConnection).toHaveBeenCalled();
      expect(result).toEqual({
        status: "healthy",
        email_service: "connected",
        timestamp: expect.any(Date),
      });
    });

    it("should return degraded status when email service is disconnected", async () => {
      emailService.verifyConnection.mockResolvedValue(false);

      const result = await controller.healthCheck();

      expect(result).toEqual({
        status: "degraded",
        email_service: "disconnected",
        timestamp: expect.any(Date),
      });
    });

    it("should handle email service verification error", async () => {
      emailService.verifyConnection.mockResolvedValue(false);

      const result = await controller.healthCheck();

      expect(result).toEqual({
        status: "degraded",
        email_service: "disconnected",
        timestamp: expect.any(Date),
      });
    });

    it("should include timestamp", async () => {
      emailService.verifyConnection.mockResolvedValue(true);
      const beforeTime = new Date();

      const result = await controller.healthCheck();

      const afterTime = new Date();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe("error handling", () => {
    it("should handle unexpected errors gracefully in sendWelcomeEmail", async () => {
      const mockDto: SendWelcomeEmailDto = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        provider: "google",
      };

      emailService.sendWelcomeEmail.mockRejectedValue(new Error("Unexpected error"));

      const result = await controller.sendWelcomeEmail(mockDto);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Error: Unexpected error");
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should handle unexpected errors gracefully in sendSubscriptionConfirmationEmail", async () => {
      const mockDto: SendSubscriptionConfirmationEmailDto = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        plan: "monthly",
        status: "trial",
      };

      emailService.sendSubscriptionConfirmationEmail.mockRejectedValue(new Error("Unexpected error"));

      const result = await controller.sendSubscriptionConfirmationEmail(mockDto);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Error: Unexpected error");
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("logging", () => {
    it("should log welcome email request", async () => {
      const logSpy = jest.spyOn(Logger.prototype, "log");
      emailService.sendWelcomeEmail.mockResolvedValue(true);

      const mockDto: SendWelcomeEmailDto = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        provider: "google",
      };

      await controller.sendWelcomeEmail(mockDto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Received welcome email request for: test@example.com"),
      );
    });

    it("should log subscription confirmation email request", async () => {
      const logSpy = jest.spyOn(Logger.prototype, "log");
      emailService.sendSubscriptionConfirmationEmail.mockResolvedValue(true);

      const mockDto: SendSubscriptionConfirmationEmailDto = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        plan: "monthly",
        status: "active",
      };

      await controller.sendSubscriptionConfirmationEmail(mockDto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Received subscription confirmation email request for: test@example.com"),
      );
    });
  });
});
