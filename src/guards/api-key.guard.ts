import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly expectedApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.expectedApiKey = this.configService.get<string>("NOTIFY_SERVICE_API_KEY") || "";

    if (!this.expectedApiKey) {
      this.logger.warn("NOTIFY_SERVICE_API_KEY not set! All requests will be rejected.");
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey || !this.expectedApiKey) {
      this.logger.warn("API key missing or not configured");
      throw new UnauthorizedException("Invalid API key");
    }

    if (apiKey !== this.expectedApiKey) {
      this.logger.warn(`Invalid API key attempt from IP: ${request.ip}`);
      throw new UnauthorizedException("Invalid API key");
    }

    this.logger.log(`Valid API key provided from IP: ${request.ip}`);
    return true;
  }

  private extractApiKey(request: Request): string | null {
    // Check Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers["x-api-key"];
    if (typeof apiKeyHeader === "string") {
      return apiKeyHeader;
    }

    return null;
  }
}
