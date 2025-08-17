const axios = require("axios");

// Configuration
const NOTIFICATION_SERVICE_URL = "http://localhost:3006/api/v1";
const API_KEY = "test-api-key"; // You'll need to set this in your .env

async function testWelcomeEmail() {
  console.log("🧪 Testing Welcome Email Functionality\n");

  try {
    // Test data
    const testEmailData = {
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      provider: "google",
      userId: "test-user-id",
    };

    console.log("📧 Sending welcome email request...");
    console.log("Data:", JSON.stringify(testEmailData, null, 2));

    const response = await axios.post(
      `${NOTIFICATION_SERVICE_URL}/notifications/welcome-email`,
      testEmailData,
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        timeout: 10000,
      },
    );

    console.log("\n✅ Response received:");
    console.log("Status:", response.status);
    console.log("Data:", JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log("\n🎉 Welcome email test successful!");
    }
    else {
      console.log("\n❌ Welcome email test failed:", response.data.message);
    }
  }
  catch (error) {
    console.error("\n❌ Test failed:", error.message);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testHealthCheck() {
  console.log("\n🔍 Testing Health Check...");

  try {
    const response = await axios.get(
      `${NOTIFICATION_SERVICE_URL}/notifications/health`,
      {
        headers: {
          "X-API-Key": API_KEY,
        },
        timeout: 5000,
      },
    );

    console.log("✅ Health check response:");
    console.log("Status:", response.status);
    console.log("Data:", JSON.stringify(response.data, null, 2));
  }
  catch (error) {
    console.error("❌ Health check failed:", error.message);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function runTests() {
  console.log("🚀 Starting Notification Service Tests\n");
  console.log("Service URL:", NOTIFICATION_SERVICE_URL);
  console.log("API Key:", API_KEY ? "[CONFIGURED]" : "[NOT CONFIGURED]");
  console.log("=" * 50);

  await testHealthCheck();
  await testWelcomeEmail();

  console.log(`\n` + `${"=" * 50}`);
  console.log("✨ Tests completed!");
  console.log("\n📋 Next steps:");
  console.log("1. Check your email inbox (if SMTP is configured)");
  console.log("2. Review notification service logs");
  console.log("3. Test the full OAuth flow with auth service");
}

// Run the tests
runTests().catch(console.error);
