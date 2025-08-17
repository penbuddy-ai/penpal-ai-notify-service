import { ExecutionContext, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { ApiKeyGuard } from "./api-key.guard";

describe("apiKeyGuard", () => {
  let guard: ApiKeyGuard;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    configService = module.get(ConfigService);

    // Mock logger to prevent console output during tests
    jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(Logger.prototype, "warn").mockImplementation();
    jest.spyOn(Logger.prototype, "error").mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  describe("constructor", () => {
    it("should get API key from config service", () => {
      expect(configService.get).toHaveBeenCalledWith("NOTIFY_SERVICE_API_KEY");
    });

    it("should warn when API key is not configured", () => {
      const warnSpy = jest.spyOn(Logger.prototype, "warn");
      mockConfigService.get.mockReturnValue("");

      // Create new guard instance to trigger constructor
      const _guard = new ApiKeyGuard(mockConfigService as any);

      expect(warnSpy).toHaveBeenCalledWith(
        "NOTIFY_SERVICE_API_KEY not set! All requests will be rejected.",
      );
    });

    it("should not warn when API key is configured", () => {
      // Create a fresh spy for this test only
      const warnSpy = jest.spyOn(Logger.prototype, "warn").mockClear();

      // Create a fresh mock that returns a valid API key
      const freshMockConfigService = {
        get: jest.fn().mockReturnValue("valid-api-key"),
      };

      // Create new guard instance to trigger constructor
      const _guard = new ApiKeyGuard(freshMockConfigService as any);

      expect(warnSpy).not.toHaveBeenCalledWith(
        "NOTIFY_SERVICE_API_KEY not set! All requests will be rejected.",
      );
    });
  });

  describe("canActivate", () => {
    const validApiKey = "valid-test-api-key";

    let mockExecutionContext: jest.Mocked<ExecutionContext>;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        headers: {},
        ip: "127.0.0.1",
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any;

      // Set up valid API key by default
      mockConfigService.get.mockReturnValue(validApiKey);
      guard = new ApiKeyGuard(mockConfigService as any);
    });

    describe("authorization header", () => {
      it("should allow access with valid Bearer token", () => {
        mockRequest.headers.authorization = `Bearer ${validApiKey}`;

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it("should reject access with invalid Bearer token", () => {
        mockRequest.headers.authorization = "Bearer invalid-key";

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      });

      it("should handle malformed Bearer header", () => {
        mockRequest.headers.authorization = "Bearer";

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      });

      it("should handle non-Bearer authorization header", () => {
        mockRequest.headers.authorization = `Basic ${validApiKey}`;

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      });
    });

    describe("x-API-Key header", () => {
      it("should allow access with valid X-API-Key header", () => {
        mockRequest.headers["x-api-key"] = validApiKey;

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it("should reject access with invalid X-API-Key header", () => {
        mockRequest.headers["x-api-key"] = "invalid-key";

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      });

      it("should handle array of X-API-Key headers", () => {
        mockRequest.headers["x-api-key"] = [validApiKey, "another-key"];

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      });
    });

    describe("header priority", () => {
      it("should prefer Authorization header over X-API-Key", () => {
        mockRequest.headers.authorization = `Bearer ${validApiKey}`;
        mockRequest.headers["x-api-key"] = "different-key";

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it("should fall back to X-API-Key when Authorization header is malformed", () => {
        mockRequest.headers.authorization = "Invalid header";
        mockRequest.headers["x-api-key"] = validApiKey;

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });
    });

    describe("error cases", () => {
      it("should reject request when no API key is provided", () => {
        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      });

      it("should reject request when API key is not configured", () => {
        mockConfigService.get.mockReturnValue("");
        guard = new ApiKeyGuard(mockConfigService as any);

        mockRequest.headers["x-api-key"] = "any-key";

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      });

      it("should throw UnauthorizedException with correct message", () => {
        try {
          guard.canActivate(mockExecutionContext);
          fail("Expected UnauthorizedException to be thrown");
        }
        catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException);
          expect(error.message).toBe("Invalid API key");
        }
      });
    });

    describe("logging", () => {
      it("should log successful authentication", () => {
        const logSpy = jest.spyOn(Logger.prototype, "log");
        mockRequest.headers["x-api-key"] = validApiKey;

        guard.canActivate(mockExecutionContext);

        expect(logSpy).toHaveBeenCalledWith(
          "Valid API key provided from IP: 127.0.0.1",
        );
      });

      it("should log invalid API key attempts", () => {
        const warnSpy = jest.spyOn(Logger.prototype, "warn");
        mockRequest.headers["x-api-key"] = "invalid-key";

        try {
          guard.canActivate(mockExecutionContext);
        }
        catch {
          // Expected error
        }

        expect(warnSpy).toHaveBeenCalledWith(
          "Invalid API key attempt from IP: 127.0.0.1",
        );
      });

      it("should log missing API key attempts", () => {
        const warnSpy = jest.spyOn(Logger.prototype, "warn");

        try {
          guard.canActivate(mockExecutionContext);
        }
        catch {
          // Expected error
        }

        expect(warnSpy).toHaveBeenCalledWith(
          "API key missing or not configured",
        );
      });

      it("should log attempts from different IP addresses", () => {
        const logSpy = jest.spyOn(Logger.prototype, "log");
        mockRequest.ip = "192.168.1.100";
        mockRequest.headers["x-api-key"] = validApiKey;

        guard.canActivate(mockExecutionContext);

        expect(logSpy).toHaveBeenCalledWith(
          "Valid API key provided from IP: 192.168.1.100",
        );
      });
    });

    describe("edge cases", () => {
      it("should handle undefined headers", () => {
        mockRequest.headers = undefined;

        expect(() => guard.canActivate(mockExecutionContext)).toThrow();
      });

      it("should handle null IP address", () => {
        mockRequest.ip = null;
        mockRequest.headers["x-api-key"] = validApiKey;

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it("should handle missing IP address", () => {
        delete mockRequest.ip;
        mockRequest.headers["x-api-key"] = validApiKey;

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it("should handle empty API key", () => {
        mockRequest.headers["x-api-key"] = "";

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      });

      it("should handle whitespace-only API key", () => {
        mockRequest.headers["x-api-key"] = "   ";

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      });
    });

    describe("aPI key extraction", () => {
      it("should extract API key from Bearer token correctly", () => {
        const testKey = "test-bearer-key-123";
        mockRequest.headers.authorization = `Bearer ${testKey}`;
        mockConfigService.get.mockReturnValue(testKey);
        guard = new ApiKeyGuard(mockConfigService as any);

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it("should extract API key from X-API-Key header correctly", () => {
        const testKey = "test-x-api-key-456";
        mockRequest.headers["x-api-key"] = testKey;
        mockConfigService.get.mockReturnValue(testKey);
        guard = new ApiKeyGuard(mockConfigService as any);

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it("should be case-sensitive for API key comparison", () => {
        const originalKey = "CaseSensitiveKey";
        const lowercaseKey = "casesensitivekey";

        mockRequest.headers["x-api-key"] = lowercaseKey;
        mockConfigService.get.mockReturnValue(originalKey);
        guard = new ApiKeyGuard(mockConfigService as any);

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      });
    });

    describe("configuration scenarios", () => {
      it("should handle null API key configuration", () => {
        mockConfigService.get.mockReturnValue(null);
        guard = new ApiKeyGuard(mockConfigService as any);

        mockRequest.headers["x-api-key"] = "any-key";

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      });

      it("should handle undefined API key configuration", () => {
        mockConfigService.get.mockReturnValue(undefined);
        guard = new ApiKeyGuard(mockConfigService as any);

        mockRequest.headers["x-api-key"] = "any-key";

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      });
    });
  });
});
