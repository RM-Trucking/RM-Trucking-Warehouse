# Email & Status Utilities - Quick Reference Card

**Print this for your desk!** 📋

---

## 🚀 One-Time Setup

### Step 1: App Initialization (src/index.ts)

```typescript
import { setupStatusEventHandlers } from "./utils/email";
import * as warehouseService from "./services/warehouse-form-service";

// Call ONCE at startup
setupStatusEventHandlers(async (log) => {
  await warehouseService.addStatusLog(log);
});
```

### Step 2: Check Environment Variables

```bash
EMAIL_FROM=noreply@tmtrucking.com
EMAIL_QUEUE_CONCURRENCY=1
EMAIL_QUEUE_DRY_RUN=false
```

---

## 💎 Common Usage Patterns

### Pattern 1: Status + Email (Most Common)

```typescript
import { emitStatusWithEmail } from "./utils/email";

emitStatusWithEmail(
  receiptNumber, // 123
  receiptId, // 456
  status, // 'SHIPPED'
  emailTo, // 'customer@example.com'
  userId, // 1
  description, // 'Item shipped'
);
```

### Pattern 2: Batch Emails

```typescript
import { queueEmailBatch } from "./utils/email";

queueEmailBatch([
  { receiptNumber: 123, to: "a@example.com", status: "SHIPPED" },
  { receiptNumber: 124, to: "b@example.com", status: "SHIPPED" },
]);
```

### Pattern 3: Rejection with Message

```typescript
import { emitEmail } from "./utils/email";

emitEmail({
  receiptNumber: 123,
  to: "customer@example.com",
  status: "REJECTED",
  message: "Package damaged - contact support",
});
```

### Pattern 4: Audit Only (No Email)

```typescript
import { emitAudit } from "./utils/email";

emitAudit({
  receiptNumber: 123,
  receiptId: 456,
  status: "LOADED",
  userId: 1,
  description: "Freight loaded",
});
```

---

## 📊 Available Statuses

| Status    | Use Case            | Template Provided       |
| --------- | ------------------- | ----------------------- |
| INITIATED | Receipt created     | ✅ Yes                  |
| LOADED    | Freight loaded      | ✅ Yes                  |
| SHIPPED   | In transit          | ✅ Yes                  |
| DISCARDED | Archived            | ✅ Yes                  |
| REJECTED  | Failed verification | ✅ Yes (custom message) |
| ACCEPTED  | Completed           | ✅ Yes                  |

---

## 🔍 Monitoring

### Check Queue Status

```typescript
import { getEmailQueueStatus, getEmailQueueStats } from "./utils/email";

console.log(getEmailQueueStatus());
// "Email Queue - Pending: 5, Running: 1, Success: 100, Failed: 2"

const stats = getEmailQueueStats();
// { pending: 5, running: 1, success: 100, failed: 2, total: 102 }
```

### Enable Debug Logging

```bash
export EMAIL_DEBUG=true
node src/index.ts
```

---

## ❌ What NOT To Do

```typescript
// ❌ WRONG - Old approach
statusEvents.emit("status", { receiptNumber: 123 });
emailQueue.push({ to: "test@example.com" });

// ✅ RIGHT - New approach
emitStatusWithEmail(123, 456, "SHIPPED", "test@example.com", 1, "desc");
```

---

## 📚 Documentation Files

| File                   | Purpose                        |
| ---------------------- | ------------------------------ |
| [README.md]            | Full API reference             |
| [SETUP_GUIDE.md]       | Configuration & initialization |
| [INTEGRATION_GUIDE.md] | Before/after examples          |

---

## 🆘 Quick Troubleshooting

### Problem: Emails not sending

**Check**:

- [ ] setupStatusEventHandlers called in index.ts?
- [ ] Database procedure SNDMULMAIL exists?
- [ ] Email address valid format?

### Problem: Audit logs not saved

**Check**:

- [ ] setupStatusEventHandlers called?
- [ ] Handler function provided?
- [ ] Database connection working?

### Problem: Queue stuck

**Check**:

- [ ] DATABASE connection alive?
- [ ] Email provider not rate limiting?
- [ ] Check: `getEmailQueueStatus()`

**Fix**: Restart server

---

## 🎯 Function Cheat Sheet

```typescript
// IMPORT
import {
  emitStatus, // Audit log only
  emitEmail, // Email only
  emitAudit, // Same as emitStatus
  emitStatusWithEmail, // Both audit + email
  queueEmail, // Add single email
  queueEmailBatch, // Add multiple emails
  sendStatusUpdateEmail, // Manual email sending
  getEmailQueueStats, // Queue metrics
  getEmailQueueStatus, // Queue status string
  setupStatusEventHandlers,
} from "./utils/email";
```

---

## 📋 Integration Checklist

- [ ] setupStatusEventHandlers() called in index.ts
- [ ] Environment variables configured
- [ ] Verified database procedure exists
- [ ] Tested email delivery
- [ ] Tested audit log saving
- [ ] Reviewed SETUP_GUIDE.md
- [ ] Updated existing services (if needed)
- [ ] Removed old statusEvents.emit() calls
- [ ] Removed old emailQueue.push() calls
- [ ] Monitor queue stats in production

---

## 💬 Email Templates (Prebuilt)

Every status has a template:

```
INITIATED  → "Warehouse Receipt #123 Initiated"
LOADED     → "Warehouse Receipt #123 - On Hand"
SHIPPED    → "Warehouse Receipt #123 - Shipped"
DISCARDED  → "Warehouse Receipt #123 - Archived"
REJECTED   → "Warehouse Receipt #123 - Rejected" + custom message
ACCEPTED   → "Warehouse Receipt #123 - Accepted"
```

Customize in: `src/utils/email/email-service.ts`

---

**Version**: 1.0  
**Last Updated**: 2024  
**Status**: Production Ready ✅
