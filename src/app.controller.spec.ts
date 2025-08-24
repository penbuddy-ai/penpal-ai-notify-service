import { Test, TestingModule } from "@nestjs/testing";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("appController", () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(appController).toBeDefined();
  });

  describe("getHello", () => {
    it("should return \"Hello World!\"", () => {
      const result = appController.getHello();
      expect(result).toBe("Hello World!");
      expect(typeof result).toBe("string");
    });

    it("should call appService.getHello", () => {
      const getHelloSpy = jest.spyOn(appService, "getHello");
      appController.getHello();
      expect(getHelloSpy).toHaveBeenCalled();
      expect(getHelloSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("healthCheck", () => {
    it("should return health status", () => {
      const result = appController.healthCheck();

      expect(result).toEqual({
        status: "healthy",
        service: "notification-service",
        timestamp: expect.any(Date),
      });
    });

    it("should return correct service name", () => {
      const result = appController.healthCheck();
      expect(result.service).toBe("notification-service");
    });

    it("should return healthy status", () => {
      const result = appController.healthCheck();
      expect(result.status).toBe("healthy");
    });

    it("should include timestamp", () => {
      const beforeTime = new Date();
      const result = appController.healthCheck();
      const afterTime = new Date();

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});
