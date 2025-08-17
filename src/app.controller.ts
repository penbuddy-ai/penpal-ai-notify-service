import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { AppService } from "./app.service";

@Controller()
@ApiTags("health")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: "Get service status" })
  @ApiResponse({ status: 200, description: "Service is running" })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("health")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Health check endpoint" })
  @ApiResponse({
    status: 200,
    description: "Service health status",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "healthy" },
        service: { type: "string", example: "notification-service" },
        timestamp: { type: "string", format: "date-time" },
      },
    },
  })
  healthCheck(): { status: string; service: string; timestamp: Date } {
    return {
      status: "healthy",
      service: "notification-service",
      timestamp: new Date(),
    };
  }
}
