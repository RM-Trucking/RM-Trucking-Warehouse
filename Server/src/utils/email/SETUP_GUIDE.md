# Email & Status Utilities - Setup Guide

Complete setup and configuration guide for the centralized email and status event system.

## 🎯 Overview

The email and status utilities provide a unified, type-safe system for:

- ✅ Sending status update emails
- ✅ Recording audit logs
- ✅ Managing async email queue
- ✅ Event-driven architecture
- ✅ Monitoring and statistics

## 📦 Prerequisites

```json
{
  "dependencies": {
    "async": "^3.2.5",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/async": "^3.2.20",
    "typescript": "^5.0.0"
  }
}
```

## 🚀 Installation Steps

### Step 1: Verify File Structure

Ensure these files exist in your project:

```
Server/
├── src/
│   ├── utils/
│   │   ├── types/
│   │   │   └── status-events.ts       ✅ Type definitions
│   │   ├── email/
│   │   │   ├── email-service.ts       ✅ Email service
│   │   │   ├── email-queue.ts         ✅ Queue management
│   │   │   ├── status-emitter.ts      ✅ Event emitter
│   │   │   ├── index.ts               ✅ Exports barrel
│   │   │   ├── README.md              ✅ Documentation
│   │   │   └── INTEGRATION_GUIDE.md   ✅ Integration examples
│   ├── config/
│   │   └── db2.ts                     ✅ DB connection
│   ├── services/
│   │   └── warehouse-form-service.ts  📝 Needs setup
│   └── index.ts                       📝 Needs initialization
```

### Step 2: Configure Environment Variables

**File**: `.env`

```bash
# Email Configuration
EMAIL_FROM=noreply@tmtrucking.com
MAIL_SERVER=smtp.your-domain.com
MAIL_PORT=587
MAIL_USER=your-email@domain.com
MAIL_PASS=your-password

# Database Configuration
DB2_HOST=your-db2-host
DB2_USER=your-user
DB2_PASS=your-password
DB2_DATABASE=your-db
DB2_SCHEMA=SCHEMANAME

# Email Settings
EMAIL_QUEUE_CONCURRENCY=1
EMAIL_QUEUE_DRY_RUN=false
```

### Step 3: Initialize in Application Startup

**File**: `src/index.ts`

```typescript
import express from "express";
import { setupStatusEventHandlers } from "./utils/email";
import * as warehouseService from "./services/warehouse-form-service";

const app = express();

// ... middleware setup ...

// ✅ CRITICAL: Initialize email/status system ONCE at startup
setupStatusEventHandlers(async (auditLog) => {
  // This handler receives all audit events
  try {
    const result = await warehouseService.addStatusLog(auditLog);
    console.log("✅ Audit log saved:", result.id);
  } catch (error) {
    console.error("❌ Failed to save audit log:", error);
    // Audit failure should not block the application
  }
});

// ... routes setup ...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 RM Trucking Server Started         ║
║  📧 Email/Status Utilities: Active     ║
║  🔗 Port: ${PORT}                          ║
╚════════════════════════════════════════╝
    `);
});

export default app;
```

### Step 4: Import and Use in Services

**Example**: `src/services/warehouse-form-service.ts`

```typescript
import {
  emitStatus,
  emitEmail,
  emitAudit,
  emitStatusWithEmail,
} from "../utils/email";
import * as WareHouseFormDB from "../database/warehouse-form";

// When creating a new warehouse receipt
export const createWarehouseReceipt = async (formData, userId) => {
  try {
    // Create the record
    const receipt = await WareHouseFormDB.createReceipt(formData);

    // Emit status with email notification
    emitStatusWithEmail(
      receipt.receiptNumber,
      receipt.receiptId,
      "INITIATED",
      formData.customerEmail, // From request
      userId,
      "Warehouse receipt initiated by system",
    );

    return receipt;
  } catch (error) {
    console.error("❌ Error creating receipt:", error);
    throw error;
  }
};

// When updating status
export const updateReceiptStatus = async (
  receiptId,
  newStatus,
  userId,
  customMessage?,
) => {
  try {
    const receipt = await WareHouseFormDB.getReceiptById(receiptId);

    // Update in database
    await WareHouseFormDB.updateStatus(receiptId, newStatus);

    // For REJECTED status, allow custom message
    if (newStatus === "REJECTED") {
      emitEmail({
        receiptNumber: receipt.receiptNumber,
        to: receipt.customerEmail,
        status: "REJECTED",
        message:
          customMessage ||
          "Your receipt has been rejected. Please contact support.",
      });
    }

    // Audit the change
    emitAudit({
      receiptNumber: receipt.receiptNumber,
      receiptId,
      status: newStatus,
      userId,
      description: customMessage || `Status changed to ${newStatus}`,
    });

    return receipt;
  } catch (error) {
    console.error("❌ Error updating receipt:", error);
    throw error;
  }
};

// Stub function to receive audit logs
export const addStatusLog = async (log: any) => {
  // This will be called by the setupStatusEventHandlers handler
  // Save log to database
  return await WareHouseFormDB.createAuditLog(log);
};
```

## ⚙️ Configuration Options

### Queue Configuration

**File**: `src/utils/email/email-queue.ts`

```typescript
// Adjust concurrency (emails sent in parallel)
const DEFAULT_CONCURRENCY = 1; // Sequential (recommended to avoid rate limits)

// For higher throughput (if your email provider allows):
const DEFAULT_CONCURRENCY = 5; // Process 5 emails in parallel
```

### Email Template Customization

**File**: `src/utils/email/email-service.ts`

```typescript
const EMAIL_TEMPLATES = {
  INITIATED: {
    subject: (receiptNumber) =>
      `Warehouse Receipt #${receiptNumber} - Initiated`,
    body: (receiptNumber) => `
            Your warehouse receipt #${receiptNumber} has been created.
            
            Next Steps:
            - Our team will review and verify your items
            - You'll receive updates as we process them
            
            Thank you for using TM Trucking.
        `,
  },
  // ... customize other statuses as needed
};
```

### Logging Configuration

Enable/disable detailed logging:

```typescript
// In each utility file, look for console.log statements:
console.log("📧 Email queued:", emailTask); // Toggle this

// Or set environment variable:
process.env.EMAIL_DEBUG = "true"; // Enable verbose logging
```

## 🔐 Security Checklist

- [ ] Email validation is enabled (validateEmailTask)
- [ ] Audit logs are saved to database
- [ ] Email addresses are not logged in plain text for external logging
- [ ] Database procedure (SNDMULMAIL) requires authentication
- [ ] Queue concurrency set appropriately (1 recommended)
- [ ] Error logs don't expose sensitive data
- [ ] Stored procedure has proper permissions
- [ ] Database credentials in environment variables only

## 🧪 Testing Setup

### Unit Test Example

```typescript
import { emitStatusWithEmail, getEmailQueueStats } from "../utils/email";

describe("Email Status System", () => {
  beforeEach(() => {
    // Reset stats before each test
    jest.clearAllMocks();
  });

  it("should emit status with email correctly", async () => {
    const statsBefore = getEmailQueueStats();

    // Emit test event
    emitStatusWithEmail(
      123,
      456,
      "SHIPPED",
      "test@example.com",
      1,
      "Test shipment",
    );

    // Small delay for async processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    const statsAfter = getEmailQueueStats();

    // Verify email was queued
    expect(statsAfter.pending + statsAfter.success).toBeGreaterThan(
      statsBefore.pending + statsBefore.success,
    );
  });

  it("should handle invalid emails gracefully", () => {
    const result = emitEmail({
      receiptNumber: 123,
      to: "invalid-email", // Invalid format
      status: "SHIPPED",
    });

    // Should log error but not throw
    expect(result).toBeDefined();
  });
});
```

### Integration Test Example

```typescript
import { startServer } from '../index';
import request from 'supertest';

describe('Email Integration', () => {
    let server;

    beforeAll(async () => {
        server = await startServer();
    });

    afterAll(() => {
        server.close();
    });

    it('should create receipt and send email', async () => {
        const response = await request(server)
            .post('/api/warehouse/receipts')
            .send({
                items: [...],
                customerEmail: 'test@example.com'
            });

        expect(response.status).toBe(201);

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify email was queued
        // (In real setup, verify in mock email service)
    });
});
```

## 📊 Monitoring Setup

### Basic Monitoring

```typescript
// Add to your health check endpoint
import { getEmailQueueStats } from "./utils/email";

app.get("/health", (req, res) => {
  const emailStats = getEmailQueueStats();

  res.json({
    status: "ok",
    timestamp: new Date(),
    email: {
      pending: emailStats.pending,
      running: emailStats.running,
      success: emailStats.success,
      failed: emailStats.failed,
    },
  });
});
```

### Periodic Queue Monitoring

```typescript
import { getEmailQueueStatus } from "./utils/email";

// Log queue status every 5 minutes
setInterval(
  () => {
    console.log(getEmailQueueStatus());
  },
  5 * 60 * 1000,
);
```

### Advanced Monitoring with Metrics

```typescript
import { getEmailQueueStats } from "./utils/email";
import * as prometheus from "prom-client";

// Create Prometheus metrics
const emailQueueGauge = new prometheus.Gauge({
  name: "email_queue_pending",
  help: "Number of pending emails in queue",
});

const emailSuccessCounter = new prometheus.Counter({
  name: "email_sent_total",
  help: "Total emails sent successfully",
});

// Update metrics periodically
setInterval(() => {
  const stats = getEmailQueueStats();
  emailQueueGauge.set(stats.pending);
  emailSuccessCounter.inc(stats.success);
}, 10 * 1000);
```

## 🐛 Troubleshooting

### Issue: "setupStatusEventHandlers is not called"

**Symptom**: Audit logs not being saved

**Solution**:

```typescript
// Verify in index.ts that this is called:
setupStatusEventHandlers(async (log) => {
  await warehouseService.addStatusLog(log);
});

// Move this to the VERY TOP of app initialization
// (before routes are registered but after modules are imported)
```

---

### Issue: "SNDMULMAIL procedure not found"

**Symptom**: Error when sending emails

**Solution**:

```typescript
// Verify stored procedure exists in DB2:
SELECT * FROM SYSCAT.PROCEDURES WHERE PROCNAME = 'SNDMULMAIL';

// If not found, ask DBA to create it or update db2.ts config
// to use correct procedure name
```

---

### Issue: "Email addresses not found"

**Symptom**: Emails not sending because recipient not in database

**Solution**:

```typescript
// Validate email source before emitting:
const freight = await getFreightWithDetails(id);
if (!freight.customerEmail) {
  console.error("❌ No customer email for freight:", id);
  return;
}

emitEmail({
  to: freight.customerEmail, // Verify this exists
  receiptNumber: freight.receiptNumber,
  status: "SHIPPED",
});
```

---

### Issue: "Queue stuck / emails not processing"

**Symptom**: High pending count, emails not being sent

**Solution**:

```typescript
// Check queue status
const status = getEmailQueueStatus();
console.log(status);

// If concurrency is 0, check database connection:
import * as db from './config/db2';
const conn = await db.getConnection();
console.log('✅ Database connected' : '❌ Database error');

// Reset queue (development only):
process.exit(1);  // Restart application
```

---

### Issue: "High failure rate"

**Symptom**: `getEmailQueueStats()` shows many failed emails

**Solution**:

```typescript
// Check error logs
// Look for: "❌ Failed to send email"

// Common causes:
// 1. Invalid email regex validation
// 2. Database procedure errors
// 3. ODBC connection dropped
// 4. Attachment file not found

// Enable debug logging:
process.env.EMAIL_DEBUG = "true";

// Restart server and check logs
```

## 📝 Checklist: Ready for Production

Before deploying to production, verify:

- [ ] `setupStatusEventHandlers` called in app startup
- [ ] Environment variables configured
- [ ] Database procedure (SNDMULMAIL) exists
- [ ] Audit log handler implemented
- [ ] Email templates customized for your domain
- [ ] Concurrency set appropriately (recommend 1)
- [ ] Monitoring/health endpoints configured
- [ ] Error logging configured
- [ ] Tested with sample email
- [ ] Database connection pool configured
- [ ] Rate limiting considered (if applicable)
- [ ] Backup email service (fallback) configured
- [ ] Documentation updated for team

## 🔗 Related Documentation

- [Email System README](./README.md) - Full API reference
- [Integration Guide](./INTEGRATION_GUIDE.md) - Before/after examples
- [Status Events Types](../../types/status-events.ts) - TypeScript definitions
- [Email Service](./email-service.ts) - Implementation details
- [Email Queue](./email-queue.ts) - Queue configuration
- [Status Emitter](./status-emitter.ts) - Event system details

## 📞 Support

For issues or questions:

1. Check troubleshooting section above
2. Review Integration Guide for patterns
3. Check Email System README for API reference
4. Review implementation files for code comments
5. Check database connection and stored procedure
