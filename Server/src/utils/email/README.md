# Email & Status Event Service

Centralized, optimized utility for managing email notifications and audit logging across the application.

## 📁 Module Structure

```
src/utils/
├── types/
│   └── status-events.ts       # Type definitions
├── email/
│   ├── email-service.ts       # Core email sending logic
│   ├── email-queue.ts         # Async queue for email management
│   ├── status-emitter.ts      # Event-driven status tracking
│   └── index.ts               # Main exports
└── README.md                  # This file
```

## 🚀 Quick Start

### 1. Initialize During App Startup

```typescript
import { setupStatusEventHandlers } from "./utils/email";
import * as warehouseService from "./services/warehouse-form-service";

// In your main app initialization
setupStatusEventHandlers(warehouseService.addStatusLog);
```

### 2. Emit Status Events

```typescript
import { emitStatus, emitStatusWithEmail } from "./utils/email";

// Option 1: Emit status with separate audit log and email
emitStatus(
  {
    receiptNumber: 123,
    receiptId: 456,
    status: "SHIPPED",
    userId: 1,
    description: "Item shipped via carrier",
  },
  {
    receiptNumber: 123,
    to: "customer@example.com",
    status: "SHIPPED",
  },
);

// Option 2: Helper function for convenience
emitStatusWithEmail(
  123, // receiptNumber
  456, // receiptId
  "SHIPPED", // status
  "customer@example.com", // emailTo
  1, // userId
  "Item shipped", // description
);
```

### 3. Send Custom Emails

```typescript
import { emitEmail } from "./utils/email";

emitEmail({
  receiptNumber: 123,
  to: "customer@example.com",
  status: "SHIPPED",
  subject: "Custom Subject", // Optional - uses template if not provided
  message: "Custom message", // Used for REJECTED status
});
```

## 📋 API Reference

### Status Emitter

#### `setupStatusEventHandlers(handler)`

Initialize the status system with audit log handler.

```typescript
setupStatusEventHandlers(async (log) => {
  await db.addAuditLog(log);
});
```

#### `emitStatus(auditLog, emailTask)`

Emit status event with optional audit logging and email.

```typescript
emitStatus(auditLog, emailTask);
```

#### `emitStatusWithEmail(...)`

Convenience helper to emit status with both audit log and email.

```typescript
emitStatusWithEmail(
  receiptNumber,
  receiptId,
  status,
  emailTo,
  userId,
  description,
  proNumber,
);
```

#### `emitEmail(emailTask)`

Emit email-only event (no audit log).

```typescript
emitEmail({
  receiptNumber: 123,
  to: "customer@example.com",
  status: "SHIPPED",
});
```

#### `emitAudit(auditLog)`

Emit audit-only event (no email).

```typescript
emitAudit({
  receiptNumber: 123,
  receiptId: 456,
  status: "INITIATED",
  userId: 1,
});
```

### Email Service

#### `sendStatusUpdateEmail(task, overrides?)`

Send email with optional template overrides.

```typescript
await sendStatusUpdateEmail(
  {
    receiptNumber: 123,
    to: "customer@example.com",
    status: "SHIPPED",
  },
  {
    subject: "Custom Subject", // Optional override
    body: "Custom body", // Optional override
  },
);
```

#### `generateEmailTemplate(receiptNumber, status, message?, subject?, body?)`

Generate email template for a given status.

```typescript
const { subject, body } = generateEmailTemplate(123, "SHIPPED");
```

#### `callEmailProcedure(to, subject, body, attachmentPath?)`

Low-level function to execute email stored procedure.

```typescript
await callEmailProcedure(
  "customer@example.com",
  "Subject Line",
  "Email body content",
  "/path/to/attachment.pdf", // Optional
);
```

### Email Queue

#### `queueEmail(task)`

Add single email to queue.

```typescript
queueEmail({
  receiptNumber: 123,
  to: "customer@example.com",
  status: "SHIPPED",
});
```

#### `queueEmailBatch(tasks)`

Add multiple emails to queue.

```typescript
queueEmailBatch([
  { receiptNumber: 123, to: "customer1@example.com", status: "SHIPPED" },
  { receiptNumber: 124, to: "customer2@example.com", status: "SHIPPED" },
]);
```

#### `getEmailQueueStats()`

Get current queue statistics.

```typescript
const stats = getEmailQueueStats();
// { pending: 5, running: 1, success: 100, failed: 2, total: 102 }
```

#### `getEmailQueueStatus()`

Get human-readable queue status.

```typescript
console.log(getEmailQueueStatus());
// "Email Queue - Pending: 5, Running: 1, Success: 100, Failed: 2"
```

## 🎯 Status Types

```typescript
enum ReceiptStatus {
  INITIATED = "INITIATED",
  LOADED = "LOADED",
  SHIPPED = "SHIPPED",
  DISCARDED = "DISCARDED",
  REJECTED = "REJECTED",
  ACCEPTED = "ACCEPTED",
}
```

Each status has a predefined email template:

| Status    | Subject                         | Body                           |
| --------- | ------------------------------- | ------------------------------ |
| INITIATED | Warehouse Receipt #X Initiated  | ...                            |
| LOADED    | Warehouse Receipt #X - On Hand  | ...                            |
| SHIPPED   | Warehouse Receipt #X - Shipped  | ...                            |
| DISCARDED | Warehouse Receipt #X - Archived | ...                            |
| REJECTED  | Warehouse Receipt #X - Rejected | Custom message can be provided |
| ACCEPTED  | Warehouse Receipt #X - Accepted | ...                            |

## 🔧 Email Task Interface

```typescript
interface EmailTask {
  to: string; // Recipient email
  receiptNumber: number; // Receipt identifier
  status?: ReceiptStatusType; // Status type (for templates)
  subject?: string; // Custom subject (overrides template)
  body?: string; // Custom body (overrides template)
  message?: string; // Custom message (used for REJECTED)
  hasAttachment?: boolean; // Include attachment flag
  attachmentPath?: string; // Path to attachment file
}
```

## 🔄 Event Flow Diagram

```
Emit Status Event
    ↓
✓ Validate Input
    ↓
✓ Save Audit Log (if provided)
    ↓
✓ Queue Email (if provided)
    ↓
[Background Processing]
    ↓
✓ Send Email via Procedure
    ↓
✓ Log Success/Failure
```

## 💡 Usage Examples

### Example 1: Receipt Initiated

```typescript
emitStatusWithEmail(
  123, // receiptNumber
  456, // receiptId
  "INITIATED", // status
  "customer@example.com", // emailTo
  1, // userId
  "Receipt created", // description
  "PRO-789", // proNumber
);
```

### Example 2: Receipt Rejected with Custom Message

```typescript
emitEmail({
  receiptNumber: 123,
  to: "customer@example.com",
  status: "REJECTED",
  message: "Rejected due to damaged package - contact support for resubmission",
});

emitAudit({
  receiptNumber: 123,
  receiptId: 456,
  status: "REJECTED",
  userId: 1,
  description: "Rejected due to damaged package",
});
```

### Example 3: Batch Status Update

```typescript
const updates = [
  { receiptNumber: 123, status: "SHIPPED" },
  { receiptNumber: 124, status: "SHIPPED" },
  { receiptNumber: 125, status: "SHIPPED" },
];

updates.forEach((update) => {
  emitStatusWithEmail(
    update.receiptNumber,
    update.receiptNumber * 100, // Example receiptId calculation
    update.status,
    "bulk-notification@example.com",
    1,
    `Batch update: ${update.status}`,
  );
});
```

## ⚙️ Configuration

### Queue Concurrency

Edit `src/utils/email/email-queue.ts`:

```typescript
const DEFAULT_CONCURRENCY = 1; // Change to increase parallel emails
```

### Email From Address

Set in environment or code:

```typescript
const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@tmtrucking.com";
```

### Email Templates

Customize templates in `src/utils/email/email-service.ts`:

```typescript
const EMAIL_TEMPLATES = {
  SHIPPED: {
    subject: (receiptNumber) => "Your custom subject",
    body: (receiptNumber) => "Your custom body",
  },
};
```

## 🔍 Monitoring & Debugging

### Check Queue Status

```typescript
import { getEmailQueueStatus } from "./utils/email";

console.log(getEmailQueueStatus());
```

### Enable Detailed Logging

All functions include console.log statements with emoji indicators:

- ✅ Success
- ❌ Error
- 📧 Email related
- 📋 Audit related
- 📬 Queue related
- ⚠️ Warning

## 🐛 Error Handling

All functions include try-catch blocks and detailed error logging:

```typescript
try {
  emitStatus(auditLog, emailTask);
} catch (error) {
  console.error("Status emission failed:", error);
  // Handle gracefully
}
```

## 📊 Performance Considerations

- **Queue Design**: Sequential processing (concurrency=1) prevents email rate limiting
- **Async Operations**: All operations are non-blocking
- **Error Recovery**: Failed emails are logged but don't block other operations
- **Memory**: Completed tasks are automatically cleaned up

## 🔐 Security

- Email validation using regex pattern
- Sanitized logging (no raw email content by default)
- Environment variable for FROM address
- Type-safe implementation prevents data misuse

## 🧪 Testing

```typescript
import { emitStatus, getEmailQueueStats } from "./utils/email";

// Test basic emission
emitStatus(auditLog, emailTask);

// Check queue processed emails
const stats = getEmailQueueStats();
console.assert(stats.success > 0, "Email should be sent");
```

## 📞 Troubleshooting

### Issue: Emails not sending

1. Check `setupStatusEventHandlers` was called
2. Verify audit log handler is registered
3. Check queue status: `getEmailQueueStatus()`

### Issue: Invalid email format error

1. Validate email format before emitting
2. Check recipient in database
3. Use `validateEmailTask()` helper

### Issue: Audit log not being saved

1. Ensure handler is registered with `setupStatusEventHandlers`
2. Check database connection
3. Verify service has correct permissions

## 📚 Related Files

- Type definitions: `src/utils/types/status-events.ts`
- Entity types: `src/entities/warehouse-receipt/index.ts`
- Config: `src/config/db2.ts`
- Services: `src/services/warehouse-form-service.ts`
