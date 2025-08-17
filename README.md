# Penpal AI - Notification Service

This microservice handles email notifications for the Penpal AI application, including welcome emails for new users and other notification types.

## Features

### Email Notifications

- **Welcome emails** for new OAuth users with personalized content
- **HTML and text templates** with responsive design
- **Multi-provider support** (Google, Facebook, Apple, GitHub)
- **Handlebars templating** for dynamic content
- **Professional email design** with Penpal AI branding
- **Error resilience** with comprehensive logging

### Security

- **API key authentication** for inter-service communication
- **Request validation** with DTOs and class-validator
- **Rate limiting ready** (can be added easily)
- **Input sanitization** and validation

### Monitoring

- **Health check endpoint** with email service status
- **Comprehensive logging** for debugging and monitoring
- **SMTP connection verification** on startup

## Technology Stack

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Nodemailer](https://nodemailer.com/) - Email sending library
- [Handlebars](https://handlebarsjs.com/) - Template engine
- [Class Validator](https://github.com/typestack/class-validator) - DTO validation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- SMTP server (Gmail, SendGrid, Mailgun, etc.)
- API key for secure inter-service communication

### Environment Variables

Create a `.env` file in the root directory:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email From Configuration
EMAIL_FROM_NAME=Penpal AI
EMAIL_FROM_ADDRESS=noreply@penpal-ai.com

# Template Configuration
EMAIL_TEMPLATE_BASE_URL=http://localhost:3000

# Service Configuration
PORT=3002
NODE_ENV=development

# API Key for inter-service communication
NOTIFY_SERVICE_API_KEY=your-notify-service-api-key

# CORS Configuration (optional)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Gmail Configuration

If using Gmail SMTP:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password in `SMTP_PASS`

### Installation

```bash
# Install dependencies
npm install

# Start the service
npm run start:dev
```

## API Endpoints

### Notifications

#### Send Welcome Email

```http
POST /api/v1/notifications/welcome-email
Content-Type: application/json
X-API-Key: your-api-key

{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "provider": "google",
  "userId": "optional-user-id"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Welcome email sent successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Health Check

```http
GET /api/v1/notifications/health
X-API-Key: your-api-key
```

**Response:**

```json
{
  "status": "healthy",
  "email_service": "connected",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Authentication

All endpoints require an API key in the request headers:

- **Authorization header**: `Authorization: Bearer your-api-key`
- **X-API-Key header**: `X-API-Key: your-api-key` (recommended)

## Email Templates

### Welcome Email Features

- **Responsive design** that works on all email clients
- **Professional branding** with Penpal AI colors and logo
- **Personalized content** with user's name and OAuth provider
- **Call-to-action button** linking to the dashboard
- **Multi-language support** (currently French, easily extensible)
- **Plain text fallback** for email clients that don't support HTML

### Template Variables

The welcome email template supports these variables:

- `{{firstName}}` - User's first name
- `{{lastName}}` - User's last name
- `{{fullName}}` - Full name (firstName + lastName)
- `{{email}}` - User's email address
- `{{provider}}` - OAuth provider (Google, Facebook, etc.)
- `{{baseUrl}}` - Application base URL
- `{{year}}` - Current year

### Customizing Templates

Templates are defined in the `EmailService` class. To customize:

1. **Modify HTML template** in `getWelcomeEmailTemplate()`
2. **Update text template** in `getWelcomeEmailTextTemplate()`
3. **Add new variables** in the template data object
4. **Test changes** using the test script

## Integration with Auth Service

The notification service is designed to work with the Penpal AI authentication service:

### Flow

1. **User authenticates** via OAuth (e.g., Google)
2. **Auth service detects** new user registration
3. **Auth service calls** notification service with user data
4. **Notification service sends** personalized welcome email
5. **Response sent back** to auth service (non-blocking)

### Error Handling

- **Authentication continues** even if email sending fails
- **Comprehensive logging** for troubleshooting
- **Graceful degradation** with fallback mechanisms
- **Timeout protection** to prevent hanging requests

## Development

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Testing Email Functionality

Use the provided test script:

```bash
# Install axios for testing (if not already installed)
npm install axios

# Run the test script
node test-email.js
```

This will test:

- Health check endpoint
- Welcome email sending
- API key authentication
- Error handling

### Building for Production

```bash
# Build the application
npm run build

# Start in production mode
npm run start:prod
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
EXPOSE 3002

CMD ["node", "dist/main.js"]
```

### Environment Configuration

**Production checklist:**

- ✅ Set secure `NOTIFY_SERVICE_API_KEY`
- ✅ Configure SMTP with production credentials
- ✅ Set proper `EMAIL_FROM_ADDRESS` and `EMAIL_FROM_NAME`
- ✅ Update `EMAIL_TEMPLATE_BASE_URL` to production URL
- ✅ Configure `ALLOWED_ORIGINS` for CORS
- ✅ Enable HTTPS in production
- ✅ Set up monitoring and logging

## Troubleshooting

### Common Issues

#### 1. Email Not Sending

**Symptoms:**

- Health check shows "disconnected"
- Welcome email requests return success but no email received

**Solutions:**

- Verify SMTP credentials in environment variables
- Check if SMTP server allows connections from your IP
- For Gmail: ensure App Password is used, not account password
- Check spam/junk folder
- Review service logs for detailed error messages

#### 2. Authentication Errors

**Symptoms:**

- 401 Unauthorized responses
- "Invalid API key" errors

**Solutions:**

- Verify `NOTIFY_SERVICE_API_KEY` is set correctly
- Ensure API key matches between auth service and notification service
- Check API key is sent in correct header format

#### 3. Template Rendering Issues

**Symptoms:**

- Emails sent but content looks broken
- Missing variables in email content

**Solutions:**

- Verify all template variables are provided
- Check Handlebars template syntax
- Test with simple variables first
- Review email in different clients

### Monitoring

Monitor these metrics:

- **Email delivery rate** (success vs. failure)
- **SMTP connection health** via health endpoint
- **Response times** for notification requests
- **Error rates** and types from logs
- **API key authentication attempts**

### Logs

Key log messages to monitor:

```
INFO  [EmailService] Welcome email sent successfully to: user@example.com
ERROR [EmailService] Failed to send welcome email to: user@example.com: Connection timeout
WARN  [ApiKeyGuard] Invalid API key attempt from IP: 192.168.1.100
INFO  [NotificationController] Received welcome email request for: user@example.com
```

## Extending the Service

### Adding New Email Types

1. **Create new DTO** in `dto/notification.dto.ts`
2. **Add email template methods** in `EmailService`
3. **Create new controller endpoint** in `NotificationController`
4. **Update auth service** to call new endpoint

### Adding SMS or Push Notifications

1. **Install notification provider** (Twilio, Firebase, etc.)
2. **Create new service** (e.g., `SmsService`, `PushService`)
3. **Add to module** and controller
4. **Extend DTOs** for new notification types

## License

This project is licensed under the MIT License.

## Support

For issues and questions:

- Check logs for detailed error messages
- Use the test script to diagnose problems
- Review SMTP provider documentation
- Check environment variable configuration
