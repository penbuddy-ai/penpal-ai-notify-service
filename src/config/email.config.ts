import { registerAs } from "@nestjs/config";

export default registerAs("email", () => ({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true" || false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  from: {
    name: process.env.EMAIL_FROM_NAME || "Penpal AI",
    address: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || "noreply@penpal-ai.com",
  },
  templates: {
    baseUrl: process.env.EMAIL_TEMPLATE_BASE_URL || "http://localhost:3000",
  },
}));
