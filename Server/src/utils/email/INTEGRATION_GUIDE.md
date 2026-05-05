# Email & Status Utilities - Integration Guide

This guide shows how to integrate the new centralized email and status utilities into existing service code.

## 📋 Before & After Patterns

### Pattern 1: Simple Status Update with Email

#### ❌ Before (Scattered Code)

```typescript
// Old approach - scattered across multiple files and services
statusEvents.emit("status", {
  receiptNumber: 123,
  receiptId: 456,
  status: "SHIPPED",
  userId: 1,
});

// Separate email operations
emailQueue.push({
  to: "customer@example.com",
  receiptnumber: 123,
  status: "SHIPPED",
});

// Manual audit log
await WareHouseFormService.getStatusLog(receiptId).catch((err) =>
  console.error(err),
);
```

#### ✅ After (Centralized)

```typescript
// New approach - single consistent call
import { emitStatusWithEmail } from "./utils/email";

emitStatusWithEmail(
  123, // receiptNumber
  456, // receiptId
  "SHIPPED", // status
  "customer@example.com", // emailTo
  1, // userId
  "Shipment dispatched", // description
);
```

---

### Pattern 2: Status with Custom Email Message

#### ❌ Before

```typescript
// Multiple separate calls needed
const template = getEmailTemplate("REJECTED");
statusEvents.emit("status", { receiptNumber: 123, status: "REJECTED" });
emailQueue.push({
  to: "customer@example.com",
  status: "REJECTED",
  message: "Rejected: Package is damaged",
});
```

#### ✅ After

```typescript
import { emitStatus, emitEmail, emitAudit } from "./utils/email";

// Audit log only
emitAudit({
  receiptNumber: 123,
  receiptId: 456,
  status: "REJECTED",
  userId: 1,
  description: "Package damaged during inspection",
});

// Email with custom message
emitEmail({
  receiptNumber: 123,
  to: "customer@example.com",
  status: "REJECTED",
  message: "Rejected: Package is damaged - contact support",
});
```

---

### Pattern 3: Multiple Recipients

#### ❌ Before

```typescript
const recipients = ["customer@example.com", "manager@example.com"];
recipients.forEach((email) => {
  emailQueue.push({
    to: email,
    receiptnumber: 123,
    status: "SHIPPED",
  });
});
statusEvents.emit("status", { receiptNumber: 123 });
```

#### ✅ After

```typescript
import { queueEmailBatch, emitAudit } from "./utils/email";

// Batch queue emails
queueEmailBatch([
  { receiptNumber: 123, to: "customer@example.com", status: "SHIPPED" },
  { receiptNumber: 123, to: "manager@example.com", status: "SHIPPED" },
]);

// Single audit log
emitAudit({
  receiptNumber: 123,
  status: "SHIPPED",
  userId: 1,
  description: "Notification sent to customer and manager",
});
```

---

## 🔧 Real-World Service Integration

### Warehouse Form Service

**File**: `src/services/warehouse-form-service.ts`

#### Original Code (Legacy)

```typescript
export const createWarehouseForm = async (formData) => {
  try {
    const result = await WareHouseFormDB.addWarehouseForm(formData);

    // Old scattered approach
    statusEvents.emit("status", {
      receiptNumber: result.receiptNumber,
      receiptId: result.receiptId,
      status: "INITIATED",
      userId: formData.userId,
    });

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
```

#### Updated Code (Using Utilities)

```typescript
import { emitAudit } from "../utils/email";

export const createWarehouseForm = async (formData) => {
  try {
    const result = await WareHouseFormDB.addWarehouseForm(formData);

    // New unified approach - audit log only (email sent based on other logic)
    emitAudit({
      receiptNumber: result.receiptNumber,
      receiptId: result.receiptId,
      status: "INITIATED",
      userId: formData.userId,
      description: "Warehouse form created",
    });

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
```

---

### EN-Route Service Update

**File**: `src/services/en-route/index.ts`

#### Original Pattern

```typescript
const createEnrouteWithPros = async (payload, currentUser) => {
  // ... validation and processing ...

  // Manual event emit
  statusEvents.on("status-update", async (data) => {
    await WareHouseFormService.addStatusLog(data);
    emailQueue.push({ to: data.email, ...data });
  });
};
```

#### Updated Pattern

```typescript
import { emitStatusWithEmail, queueEmailBatch } from "../utils/email";

const createEnrouteWithPros = async (payload, currentUser) => {
  // ... validation and processing ...

  // Unified unified approach
  payload.freightDetails.forEach((freight) => {
    emitStatusWithEmail(
      freight.proNumber,
      freight.receiptId,
      "SHIPPED",
      freight.toEmails[0], // Primary recipient
      currentUser.id,
      "Freight in transit",
      freight.proNumber,
    );
  });
};
```

---

## 📊 Service Integration Checklist

Use this checklist when integrating utilities into a service:

- [ ] Import required utilities from `./utils/email`
- [ ] Identify all `statusEvents.emit()` calls
- [ ] Identify all `emailQueue.push()` calls
- [ ] Map old code to new patterns (see above)
- [ ] Replace scattered calls with `emitStatus*()` functions
- [ ] Remove old event listeners
- [ ] Test email delivery
- [ ] Verify audit logs are created
- [ ] Check queue statistics: `getEmailQueueStatus()`

---

## 🎯 Integration Scenarios

### Scenario 1: Status-Only Update (No Email)

```typescript
// When only audit log is needed
emitAudit({
  receiptNumber: 123,
  receiptId: 456,
  status: "LOADED",
  userId: 1,
  description: "Freight loaded onto vehicle",
});
```

### Scenario 2: Email-Only Update (No Audit)

```typescript
// When only email notification is needed
emitEmail({
  receiptNumber: 123,
  to: "customer@example.com",
  status: "SHIPPED",
});
```

### Scenario 3: Status + Email (Common)

```typescript
// Most common: both audit log and email
emitStatusWithEmail(
  123, // receiptNumber
  456, // receiptId
  "SHIPPED", // status
  "customer@example.com", // emailTo
  1, // userId
  "Shipment en route", // description
);
```

### Scenario 4: Multiple Recipients

```typescript
import { queueEmailBatch } from "./utils/email";

// Queue emails for multiple recipients
queueEmailBatch([
  { receiptNumber: 123, to: "customer@example.com", status: "SHIPPED" },
  { receiptNumber: 123, to: "shipper@example.com", status: "SHIPPED" },
  { receiptNumber: 123, to: "carrier@example.com", status: "SHIPPED" },
]);

// Single audit log for the status change
emitAudit({
  receiptNumber: 123,
  status: "SHIPPED",
  userId: 1,
  description: "Shipment notification sent to all parties",
});
```

### Scenario 5: Error State with Rejection

```typescript
// When rejecting a receipt
emitAudit({
  receiptNumber: 123,
  receiptId: 456,
  status: "REJECTED",
  userId: 1,
  description: "Receipt rejected due to weight discrepancy",
});

emitEmail({
  receiptNumber: 123,
  to: "customer@example.com",
  status: "REJECTED",
  message:
    "Your receipt has been rejected due to weight discrepancy. Please contact support.",
});
```

---

## 🚀 Step-by-Step Migration Example

### Original Service

```typescript
// src/services/freight-service.ts (OLD)
export const updateFreightStatus = async (receiptId, newStatus, email) => {
  const receipt = await FreightDB.getReceipt(receiptId);

  // Old scattered pattern
  statusEvents.emit("status-changed", {
    receiptNumber: receipt.receiptNumber,
    status: newStatus,
  });

  // Separate email send
  if (email) {
    emailQueue.push({
      to: email,
      receiptnumber: receipt.receiptNumber,
      status: newStatus,
    });
  }

  // Manual audit
  const log = await FreightDB.addAuditLog({
    receiptId,
    status: newStatus,
    timestamp: new Date(),
  });

  return log;
};
```

### Step 1: Add Import

```typescript
// Step 1: Import utilities
import { emitStatusWithEmail, emitAudit } from "../utils/email";
```

### Step 2: Simplify Implementation

```typescript
// Step 2: Replace with centralized approach
export const updateFreightStatus = async (
  receiptId,
  newStatus,
  email,
  userId,
) => {
  const receipt = await FreightDB.getReceipt(receiptId);

  // Single unified call handles: audit log + email
  emitStatusWithEmail(
    receipt.receiptNumber, // receiptNumber
    receiptId, // receiptId
    newStatus, // status
    email, // emailTo
    userId, // userId
    `Status updated to ${newStatus}`, // description
  );

  return receipt;
};
```

### Step 3: Remove Old Code

```typescript
// Step 3: Remove these old patterns
// ❌ REMOVE: statusEvents.emit() calls
// ❌ REMOVE: emailQueue.push() calls
// ❌ REMOVE: manual FreightDB.addAuditLog() calls
```

---

## 🔄 Initialization in Main App

**File**: `src/index.ts` or `src/app.ts`

```typescript
import express from "express";
import { setupStatusEventHandlers } from "./utils/email";
import * as warehouseService from "./services/warehouse-form-service";

const app = express();

// ... other middleware setup ...

// Initialize email and status system ONCE during app startup
setupStatusEventHandlers(async (auditLog) => {
  // Handler to save audit logs to database
  await warehouseService.addStatusLog(auditLog);
});

// ... routes setup ...

app.listen(process.env.PORT || 3000, () => {
  console.log("✅ Server started with email/status utilities initialized");
});
```

---

## 📈 Metrics & Monitoring

### Monitor Email Queue

```typescript
import { getEmailQueueStats, getEmailQueueStatus } from "./utils/email";

// In a periodic check (e.g., every 5 minutes)
setInterval(
  () => {
    const stats = getEmailQueueStats();
    const status = getEmailQueueStatus();

    console.log("📊 Email Stats:", stats);
    console.log("📬 Queue Status:", status);

    // Alert if too many failures
    if (stats.failed > 10) {
      console.warn("⚠️ High email failure rate detected");
      // Send alert to monitoring system
    }
  },
  5 * 60 * 1000,
);
```

### Log Success Metrics

```typescript
import { emitStatusWithEmail, getEmailQueueStats } from './utils/email';

// After bulk operations
emitStatusWithEmail(...);
const stats = getEmailQueueStats();
console.log(`✅ Processed email: Success=${stats.success}, Failed=${stats.failed}`);
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ Mistake 1: Not initializing setupStatusEventHandlers

```typescript
// WRONG - audit logs won't be saved
emitStatus(...);  // Handler not registered!
```

### ✅ Correct

```typescript
// RIGHT - initialize once at startup
setupStatusEventHandlers(handler);
emitStatus(...);  // Now audit logs are saved
```

---

### ❌ Mistake 2: Using old statusEvents pattern

```typescript
// WRONG - old approach
statusEvents.emit("status", { receiptNumber: 123 });
emailQueue.push({ to: "test@example.com" });
```

### ✅ Correct

```typescript
// RIGHT - new unified approach
emitStatusWithEmail(123, 456, "SHIPPED", "test@example.com", 1, "desc");
```

---

### ❌ Mistake 3: Not validating before emitting

```typescript
// WRONG - no validation
emitEmail({ to: invalidEmail, receiptNumber: 123 });
```

### ✅ Correct

```typescript
// RIGHT - validate first
if (validateEmailTask({ to: email, receiptNumber: 123 })) {
  emitEmail({ to: email, receiptNumber: 123, status: "SHIPPED" });
}
```

---

## 🧪 Testing Integration

### Test Email Emission

```typescript
import { emitStatusWithEmail, getEmailQueueStats } from "./utils/email";

describe("Email Integration", () => {
  it("should emit status with email", async () => {
    const beforeStats = getEmailQueueStats();

    emitStatusWithEmail(123, 456, "SHIPPED", "test@example.com", 1, "test");

    // Give queue time to process
    await new Promise((resolve) => setTimeout(resolve, 100));

    const afterStats = getEmailQueueStats();
    expect(afterStats.success).toBeGreaterThan(beforeStats.success);
  });
});
```

---

## 📚 Additional Resources

- Main README: [README.md](./README.md)
- Type Definitions: [src/utils/types/status-events.ts](../../types/status-events.ts)
- Email Service: [src/utils/email/email-service.ts](./email-service.ts)
- Queue Management: [src/utils/email/email-queue.ts](./email-queue.ts)
- Status Emitter: [src/utils/email/status-emitter.ts](./status-emitter.ts)
