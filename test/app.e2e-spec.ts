import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";

import { AppModule } from "../src/app.module";

describe("NotificationService (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    // Set up test environment variables
    process.env.NOTIFY_SERVICE_API_KEY = "test-api-key-123";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Add the same pipes as in main.ts
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
    }));

    app.setGlobalPrefix("api/v1");

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    // Clean up environment variables
    delete process.env.NOTIFY_SERVICE_API_KEY;
  });

  describe("App Endpoints", () => {
    it("/api/v1/ (GET) - should return service information", () => {
      return request(app.getHttpServer())
        .get("/api/v1/")
        .expect(200)
        .expect("Hello World!");
    });

    it("/api/v1/health (GET) - should return health status", () => {
      return request(app.getHttpServer())
        .get("/api/v1/health")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("status", "healthy");
          expect(res.body).toHaveProperty("service", "notification-service");
          expect(res.body).toHaveProperty("timestamp");
        });
    });
  });

  describe("Notification Endpoints (protected)", () => {
    const validApiKey = "test-api-key-123";

    // API key is already set in the main beforeEach

    it("/api/v1/notifications/health (GET) - should return health status with valid API key", () => {
      return request(app.getHttpServer())
        .get("/api/v1/notifications/health")
        .set("x-api-key", validApiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("status");
          expect(res.body).toHaveProperty("email_service");
          expect(res.body).toHaveProperty("timestamp");
          expect(["healthy", "degraded"]).toContain(res.body.status);
          expect(["connected", "disconnected"]).toContain(res.body.email_service);
        });
    });

    it("/api/v1/notifications/health (GET) - should reject without API key", () => {
      return request(app.getHttpServer())
        .get("/api/v1/notifications/health")
        .expect(401);
    });

    it("/api/v1/notifications/health (GET) - should reject with invalid API key", () => {
      return request(app.getHttpServer())
        .get("/api/v1/notifications/health")
        .set("x-api-key", "invalid-key")
        .expect(401);
    });

    it("/api/v1/notifications/welcome-email (POST) - should validate email format", () => {
      const invalidEmailDto = {
        email: "invalid-email",
        firstName: "John",
        lastName: "Doe",
        provider: "google",
      };

      return request(app.getHttpServer())
        .post("/api/v1/notifications/welcome-email")
        .set("x-api-key", validApiKey)
        .send(invalidEmailDto)
        .expect(400);
    });

    it("/api/v1/notifications/welcome-email (POST) - should validate provider", () => {
      const invalidProviderDto = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        provider: "invalid-provider",
      };

      return request(app.getHttpServer())
        .post("/api/v1/notifications/welcome-email")
        .set("x-api-key", validApiKey)
        .send(invalidProviderDto)
        .expect(400);
    });

    it("/api/v1/notifications/welcome-email (POST) - should validate required fields", () => {
      const incompleteDto = {
        email: "test@example.com",
        // Missing firstName, lastName, provider
      };

      return request(app.getHttpServer())
        .post("/api/v1/notifications/welcome-email")
        .set("x-api-key", validApiKey)
        .send(incompleteDto)
        .expect(400);
    });

    it("/api/v1/notifications/welcome-email (POST) - should accept valid welcome email request", () => {
      const validDto = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        provider: "google",
        userId: "user123",
      };

      return request(app.getHttpServer())
        .post("/api/v1/notifications/welcome-email")
        .set("x-api-key", validApiKey)
        .send(validDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("success");
          expect(res.body).toHaveProperty("message");
          expect(res.body).toHaveProperty("timestamp");
          expect(typeof res.body.success).toBe("boolean");
        });
    });

    it("/api/v1/notifications/subscription-confirmation (POST) - should validate subscription plan", () => {
      const invalidPlanDto = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        plan: "invalid-plan",
        status: "active",
      };

      return request(app.getHttpServer())
        .post("/api/v1/notifications/subscription-confirmation")
        .set("x-api-key", validApiKey)
        .send(invalidPlanDto)
        .expect(400);
    });

    it("/api/v1/notifications/subscription-confirmation (POST) - should validate subscription status", () => {
      const invalidStatusDto = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        plan: "monthly",
        status: "invalid-status",
      };

      return request(app.getHttpServer())
        .post("/api/v1/notifications/subscription-confirmation")
        .set("x-api-key", validApiKey)
        .send(invalidStatusDto)
        .expect(400);
    });

    it("/api/v1/notifications/subscription-confirmation (POST) - should accept valid subscription request", () => {
      const validDto = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        plan: "monthly",
        status: "active",
        amount: 999,
        currency: "EUR",
      };

      return request(app.getHttpServer())
        .post("/api/v1/notifications/subscription-confirmation")
        .set("x-api-key", validApiKey)
        .send(validDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("success");
          expect(res.body).toHaveProperty("message");
          expect(res.body).toHaveProperty("timestamp");
          expect(typeof res.body.success).toBe("boolean");
        });
    });
  });

  describe("Authentication", () => {
    const validApiKey = "test-api-key-123"; // Use same API key as set in beforeEach

    it("should accept Bearer token authentication", () => {
      return request(app.getHttpServer())
        .get("/api/v1/notifications/health")
        .set("Authorization", `Bearer ${validApiKey}`)
        .expect(200);
    });

    it("should accept X-API-Key header authentication", () => {
      return request(app.getHttpServer())
        .get("/api/v1/notifications/health")
        .set("X-API-Key", validApiKey)
        .expect(200);
    });

    it("should reject request without authentication", () => {
      return request(app.getHttpServer())
        .get("/api/v1/notifications/health")
        .expect(401);
    });

    it("should reject request with invalid Bearer token", () => {
      return request(app.getHttpServer())
        .get("/api/v1/notifications/health")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);
    });

    it("should reject request with malformed Authorization header", () => {
      return request(app.getHttpServer())
        .get("/api/v1/notifications/health")
        .set("Authorization", "Invalid header format")
        .expect(401);
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent routes", () => {
      return request(app.getHttpServer())
        .get("/non-existent-route")
        .expect(404);
    });

    it("should handle invalid JSON payload", () => {
      const validApiKey = "test-api-key-123";

      return request(app.getHttpServer())
        .post("/api/v1/notifications/welcome-email")
        .set("x-api-key", validApiKey)
        .set("Content-Type", "application/json")
        .send("invalid json")
        .expect(400);
    });

    it("should handle missing Content-Type header", () => {
      const validApiKey = "test-api-key-123";

      return request(app.getHttpServer())
        .post("/api/v1/notifications/welcome-email")
        .set("x-api-key", validApiKey)
        .send({
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          provider: "google",
        })
        .expect(200);
    });
  });

  describe("Response Format", () => {
    const validApiKey = "test-api-key-123"; // Use same API key as set in beforeEach

    it("should return consistent timestamp format", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/notifications/health")
        .set("x-api-key", validApiKey)
        .expect(200);

      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(response.body.timestamp).toMatch(timestampRegex);
    });

    it("should return valid JSON for all endpoints", async () => {
      const endpoints = [
        { method: "get", path: "/api/v1/health" },
        { method: "get", path: "/api/v1/notifications/health" },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())[endpoint.method](endpoint.path)
          .set("x-api-key", validApiKey);

        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(typeof response.body).toBe("object");
      }
    });
  });
});
