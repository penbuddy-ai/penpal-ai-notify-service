import { Test, TestingModule } from "@nestjs/testing";

import { AppService } from "./app.service";

describe("appService", () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getHello", () => {
    it("should return \"Hello World!\"", () => {
      const result = service.getHello();
      expect(result).toBe("Hello World!");
      expect(typeof result).toBe("string");
    });

    it("should always return the same message", () => {
      const result1 = service.getHello();
      const result2 = service.getHello();
      expect(result1).toBe(result2);
    });

    it("should not return empty string", () => {
      const result = service.getHello();
      expect(result).not.toBe("");
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
