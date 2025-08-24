import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import * as nodemailer from "nodemailer";

import { CompiledTemplate, SubscriptionConfirmationEmailData, TemplateService, WelcomeEmailData } from "../utils/template.service";
import { EmailService } from "./email.service";

// Mock nodemailer
jest.mock("nodemailer");
const mockNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

describe("emailService", () => {
  let service: EmailService;
  let configService: jest.Mocked<ConfigService>;
  let templateService: jest.Mocked<TemplateService>;
  let mockTransporter: jest.Mocked<nodemailer.Transporter>;

  const mockEmailConfig = {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "test@example.com",
      pass: "testpass",
    },
    from: {
      name: "Penpal AI",
      address: "noreply@penpal-ai.com",
    },
    templates: {
      baseUrl: "http://localhost:3000",
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockTemplateService = {
    getWelcomeEmailTemplate: jest.fn(),
    getSubscriptionConfirmationEmailTemplate: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
    } as any;

    mockNodemailer.createTransport.mockReturnValue(mockTransporter);
    mockConfigService.get.mockReturnValue(mockEmailConfig);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TemplateService, useValue: mockTemplateService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);
    templateService = module.get(TemplateService);

    // Mock logger to prevent console output during tests
    jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(Logger.prototype, "error").mockImplementation();
    jest.spyOn(Logger.prototype, "warn").mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("constructor and initialization", () => {
    it("should initialize with email configuration", () => {
      expect(configService.get).toHaveBeenCalledWith("email");
      expect(mockNodemailer.createTransport).toHaveBeenCalledWith({
        host: mockEmailConfig.host,
        port: mockEmailConfig.port,
        secure: mockEmailConfig.secure,
        auth: {
          user: mockEmailConfig.auth.user,
          pass: mockEmailConfig.auth.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    });

    it("should handle transporter creation error", () => {
      mockNodemailer.createTransport.mockImplementation(() => {
        throw new Error("Transporter creation failed");
      });

      expect(() => {
        const _service = new EmailService(configService, templateService);
      }).toThrow("Transporter creation failed");
    });
  });

  describe("sendWelcomeEmail", () => {
    const mockUserData: WelcomeEmailData = {
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      provider: "google",
    };

    const mockTemplate: CompiledTemplate = {
      subject: "Welcome to Penpal AI!",
      html: "<h1>Welcome John!</h1>",
      text: "Welcome John!",
    };

    it("should send welcome email successfully", async () => {
      templateService.getWelcomeEmailTemplate.mockResolvedValue(mockTemplate);
      mockTransporter.sendMail.mockResolvedValue({ messageId: "test-message-id" });

      const result = await service.sendWelcomeEmail(mockUserData);

      expect(templateService.getWelcomeEmailTemplate).toHaveBeenCalledWith(mockUserData);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: {
          name: mockEmailConfig.from.name,
          address: mockEmailConfig.from.address,
        },
        to: mockUserData.email,
        subject: mockTemplate.subject,
        text: mockTemplate.text,
        html: mockTemplate.html,
      });
      expect(result).toBe(true);
    });

    it("should handle email sending failure", async () => {
      templateService.getWelcomeEmailTemplate.mockResolvedValue(mockTemplate);
      mockTransporter.sendMail.mockRejectedValue(new Error("SMTP error"));

      const result = await service.sendWelcomeEmail(mockUserData);

      expect(result).toBe(false);
    });

    it("should handle template generation failure", async () => {
      templateService.getWelcomeEmailTemplate.mockRejectedValue(new Error("Template error"));

      const result = await service.sendWelcomeEmail(mockUserData);

      expect(result).toBe(false);
    });

    it("should run in test mode when SMTP not configured", async () => {
      const testConfig = {
        ...mockEmailConfig,
        auth: { user: "", pass: "" },
      };
      configService.get.mockReturnValue(testConfig);

      // Recreate service with test config
      const testModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: { get: () => testConfig } },
          { provide: TemplateService, useValue: mockTemplateService },
        ],
      }).compile();

      const testService = testModule.get<EmailService>(EmailService);
      const result = await testService.sendWelcomeEmail(mockUserData);

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe("sendSubscriptionConfirmationEmail", () => {
    const mockSubscriptionData: SubscriptionConfirmationEmailData = {
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      plan: "monthly",
      status: "active",
      trialEnd: new Date("2024-02-15"),
      nextBillingDate: new Date("2024-02-15"),
      amount: 999,
      currency: "EUR",
    };

    const mockTemplate: CompiledTemplate = {
      subject: "Subscription Confirmed!",
      html: "<h1>Subscription Active!</h1>",
      text: "Subscription Active!",
    };

    it("should send subscription confirmation email successfully", async () => {
      templateService.getSubscriptionConfirmationEmailTemplate.mockResolvedValue(mockTemplate);
      mockTransporter.sendMail.mockResolvedValue({ messageId: "test-message-id" });

      const result = await service.sendSubscriptionConfirmationEmail(mockSubscriptionData);

      expect(templateService.getSubscriptionConfirmationEmailTemplate).toHaveBeenCalledWith(mockSubscriptionData);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: {
          name: mockEmailConfig.from.name,
          address: mockEmailConfig.from.address,
        },
        to: mockSubscriptionData.email,
        subject: mockTemplate.subject,
        text: mockTemplate.text,
        html: mockTemplate.html,
      });
      expect(result).toBe(true);
    });

    it("should handle email sending failure", async () => {
      templateService.getSubscriptionConfirmationEmailTemplate.mockResolvedValue(mockTemplate);
      mockTransporter.sendMail.mockRejectedValue(new Error("SMTP error"));

      const result = await service.sendSubscriptionConfirmationEmail(mockSubscriptionData);

      expect(result).toBe(false);
    });

    it("should handle template generation failure", async () => {
      templateService.getSubscriptionConfirmationEmailTemplate.mockRejectedValue(new Error("Template error"));

      const result = await service.sendSubscriptionConfirmationEmail(mockSubscriptionData);

      expect(result).toBe(false);
    });

    it("should run in test mode when SMTP not configured", async () => {
      const testConfig = {
        ...mockEmailConfig,
        auth: { user: "", pass: "" },
      };

      // Recreate service with test config
      const testModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: { get: () => testConfig } },
          { provide: TemplateService, useValue: mockTemplateService },
        ],
      }).compile();

      const testService = testModule.get<EmailService>(EmailService);
      const result = await testService.sendSubscriptionConfirmationEmail(mockSubscriptionData);

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe("verifyConnection", () => {
    it("should return true when connection is verified", async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await service.verifyConnection();

      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should return false when connection verification fails", async () => {
      mockTransporter.verify.mockRejectedValue(new Error("Connection failed"));

      const result = await service.verifyConnection();

      expect(result).toBe(false);
    });

    it("should handle verification timeout", async () => {
      mockTransporter.verify.mockRejectedValue(new Error("Timeout"));

      const result = await service.verifyConnection();

      expect(result).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should handle network errors gracefully", async () => {
      const mockUserData: WelcomeEmailData = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        provider: "google",
      };

      templateService.getWelcomeEmailTemplate.mockResolvedValue({
        subject: "Welcome!",
        html: "<h1>Welcome!</h1>",
        text: "Welcome!",
      });
      mockTransporter.sendMail.mockRejectedValue(new Error("ECONNRESET"));

      const result = await service.sendWelcomeEmail(mockUserData);

      expect(result).toBe(false);
    });

    it("should handle authentication errors", async () => {
      const mockUserData: WelcomeEmailData = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        provider: "google",
      };

      templateService.getWelcomeEmailTemplate.mockResolvedValue({
        subject: "Welcome!",
        html: "<h1>Welcome!</h1>",
        text: "Welcome!",
      });
      mockTransporter.sendMail.mockRejectedValue(new Error("Invalid credentials"));

      const result = await service.sendWelcomeEmail(mockUserData);

      expect(result).toBe(false);
    });
  });

  describe("logging", () => {
    it("should log successful email sending", async () => {
      const logSpy = jest.spyOn(Logger.prototype, "log");

      const mockUserData: WelcomeEmailData = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        provider: "google",
      };

      templateService.getWelcomeEmailTemplate.mockResolvedValue({
        subject: "Welcome!",
        html: "<h1>Welcome!</h1>",
        text: "Welcome!",
      });
      mockTransporter.sendMail.mockResolvedValue({ messageId: "test-id" });

      await service.sendWelcomeEmail(mockUserData);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Welcome email sent successfully to test@example.com"),
      );
    });

    it("should log errors when email sending fails", async () => {
      const errorSpy = jest.spyOn(Logger.prototype, "error");

      const mockUserData: WelcomeEmailData = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        provider: "google",
      };

      templateService.getWelcomeEmailTemplate.mockResolvedValue({
        subject: "Welcome!",
        html: "<h1>Welcome!</h1>",
        text: "Welcome!",
      });
      mockTransporter.sendMail.mockRejectedValue(new Error("SMTP error"));

      await service.sendWelcomeEmail(mockUserData);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send welcome email to test@example.com: SMTP error"),
        expect.any(String),
      );
    });
  });

  describe("test mode", () => {
    it("should display test email content when in test mode", async () => {
      const testConfig = {
        ...mockEmailConfig,
        auth: { user: "", pass: "" },
      };

      const testModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: { get: () => testConfig } },
          { provide: TemplateService, useValue: mockTemplateService },
        ],
      }).compile();

      const testService = testModule.get<EmailService>(EmailService);
      const logSpy = jest.spyOn(Logger.prototype, "log");

      const mockUserData: WelcomeEmailData = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        provider: "google",
      };

      await testService.sendWelcomeEmail(mockUserData);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("EMAIL DE TEST - BIENVENUE"),
      );
    });
  });
});
