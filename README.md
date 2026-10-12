# Live Kitchen Operations — Full-Stack Concurrency & Real-Time System

A production-grade, highly reliable food-ordering and kitchen operations platform built for high-concurrency environments.

Built for the **inMinutes Full-Stack Developer Internship Assessment** with **React**, **Vite**, **TypeScript**, **Node.js / Express**, **Socket.IO**, and **PostgreSQL**.

---

## 📑 Table of Contents
1. [Prerequisites & Verified Versions Used](#1-prerequisites--verified-versions-used)
2. [Setup & Run Instructions (Step-by-Step)](#2-setup--run-instructions-step-by-step)
3. [Architecture & Concurrency Design](#3-architecture--concurrency-design)
   - How PostgreSQL Transactions Prevent Overselling
   - Where Stock Is Handled & Atomic Conditional SQL
   - Real-Time Synchronization & Sequence Tracking
   - How We Verified It Holds Up Under Concurrent Orders
4. [List of Packages Used & Justifications](#4-list-of-packages-used--justifications)
5. [Assumptions Made During Development](#5-assumptions-made-during-development)
6. [Testing & Verification Guide](#6-testing--verification-guide)
7. [Step-by-Step Video Demonstration Script](#7-step-by-step-video-demonstration-script)

---

## 1. Prerequisites & Verified Versions Used

This project runs strictly on standard, verified, LTS tool versions without any Docker or heavy microservices overhead:

- **Node.js**: `v20.20.0`
- **npm**: `10.8.2`
- **PostgreSQL**: `18.6` (Running locally on port `5432`)
- **TypeScript**: `5.7.3`
- **React**: `19.2.8`
- **Vite**: `8.3.4`
- **Express**: `4.21.2`
- **Socket.IO**: `4.8.1`
- **Vitest**: `3.0.7`
- **Supertest**: `7.0.0`

---

## 2. Setup & Run Instructions (Step-by-Step)

### Step 1: Clone Repository & Install Dependencies
The repository is organized as an npm workspace monorepo (`server` and `client`):
```bash
git clone https://github.com/komalmahendrakar/KomKitchen
cd kom_kitchen
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file inside the `server/` directory (or edit `server/.env`):
```env
PORT=4000
NODE_ENV=development

# PostgreSQL Connection Settings
PGHOST=localhost
PGPORT=5432
PGDATABASE=kom_kitchen_db
PGUSER=postgres
PGPASSWORD=your_actual_postgres_password

# Client CORS & Socket.IO Origin
CLIENT_URL=http://localhost:5173
```

### Step 3: Initialize Database, Migrations & Seeds
Make sure your local PostgreSQL service is running. Create the database `kom_kitchen_db`:
```sql
CREATE DATABASE kom_kitchen_db;
```

Run the versioned migration runner and seed the menu:
```bash
# 1. Run repeatable versioned SQL migrations
npm run migrate --workspace=server

# 2. Seed initial menu items (including the 1-stock item for race testing)
npm run seed --workspace=server
```

### Step 4: Start Development Servers
Open two terminal windows:

**Terminal 1 — Backend API & Real-Time Gateway:**
```bash
npm run dev:server
```
*(Runs on `http://localhost:4000`)*

**Terminal 2 — Customer & Kitchen Frontend:**
```bash
npm run dev:client
```
*(Runs on `http://localhost:5173`)*

- **Customer Menu Screen**: [http://localhost:5173](http://localhost:5173)
- **Kitchen Operations Board**: [http://localhost:5173/kitchen](http://localhost:5173/kitchen)

---

## 3. Architecture & Concurrency Design

### a. Where Stock is Handled & How PostgreSQL Prevents Overselling
Stock is **never** handled via frontend calculations, preliminary `SELECT` statements, or Node.js in-memory counters. PostgreSQL is the single authoritative source of truth.

All stock deductions occur inside an isolated ACID database transaction utilizing **atomic conditional updates** on one checked-out client:

```sql
UPDATE menu_items
SET stock = stock - $1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $2 AND stock >= $1
RETURNING id, name, price, stock;
```

#### The Invariants:
1. **Zero Overselling / Non-Negative Stock**: The database has a check constraint (`CHECK (stock >= 0)`).
2. **All-or-Nothing Reservations**: If an order requests multiple items (e.g., 1 Burger and 2 Fries) and *any* requested item cannot fulfill `stock >= requested`, the entire transaction executes a **`ROLLBACK`**. No partial reservations ever occur.
3. **Dedicated Client Lifecycle**: Managed strictly using a helper that guarantees client checkout and release in a `finally` block:
   ```typescript
   export async function withTransaction<T>(
     callback: (client: pg.PoolClient) => Promise<T>
   ): Promise<T> {
     const client = await pool.connect();
     try {
       await client.query('BEGIN');
       const result = await callback(client);
       await client.query('COMMIT');
       return result;
     } catch (error) {
       await client.query('ROLLBACK');
       throw error;
     } finally {
       client.release();
     }
   }
   ```
4. **Deadlock Prevention**: When an order contains multiple menu items, the IDs are sorted deterministically (`sortedItemIds`) before locking or updating rows, preventing circular lock deadlocks under concurrent requests.

### b. Strict Idempotency (`clientRequestId`)
- Every order payload carries a client-generated UUID (`clientRequestId`).
- Supported by a unique database constraint (`UNIQUE (client_request_id)`).
- When a client encounters network packet drops or double-submits, the transaction detects the existing `clientRequestId` and safely returns the original committed order without charging or decrementing stock twice.

### c. Kitchen State Machine & Optimistic Concurrency
- Validated state lifecycle: `NEW` ➔ `COOKING` ➔ `READY` ➔ `PICKED_UP`.
- Kitchen staff transitions use conditional database updates:
  ```sql
  UPDATE orders
  SET status = $1, updated_at = CURRENT_TIMESTAMP
  WHERE id = $2 AND status = $expectedStatus
  RETURNING ...;
  ```
- If another kitchen operator transitioned the ticket milliseconds earlier, 0 rows match and the server returns a `409 STATUS_CONFLICT` with the current order status, preventing stale overrides.

### d. Real-Time Synchronization Architecture
- **REST for Commands**: Placing orders and triggering kitchen state transitions use REST for reliable HTTP status codes (`201`, `400`, `409`).
- **Socket.IO for Live Updates**: Events are broadcasted **strictly after the database transaction has committed**:
  - `STOCK_UPDATED`: Broadcasts inventory deltas to all connected customer menus.
  - `ORDER_CREATED`: Broadcasts new incoming tickets to `room:kitchen`.
  - `ORDER_STATUS_CHANGED`: Broadcasts transition events to `room:kitchen` and individual order rooms (`room:order:<id>`).
- **Monotonic Sequence Tracker**: A PostgreSQL table `sequence_tracker` increments a monotonic counter on each state mutation, allowing reconnecting clients to identify sequence gaps and resync snapshots.
- **Real-Time Cart Auto-Eviction**: If an item in a customer's open cart sells out due to another buyer, Socket.IO updates the cart, removes the unavailable item, and displays an explicit banner:  
  *`⚡ Just Sold Out: "<item>" was purchased by another customer and removed from your cart!`*

### e. How We Checked It Holds Up When Orders Arrive at Once
We verified concurrency under two independent automated suites:

1. **Vitest + Supertest Concurrent Integration Test (`server/tests/integration.test.ts`)**:
   - Resets the 1-stock item (*Artisan Wagyu Cheeseburger*).
   - Fires **5 simultaneous HTTP order requests** in parallel using `Promise.all()`.
   - **Observed Result**: Exactly **1** request receives `201 Created`, **4** requests are rejected with `409 Conflict (INSUFFICIENT_STOCK)`, and PostgreSQL final stock is asserted to be exactly **0** (never negative).
2. **Repeatable Concurrent Load-Test Script (`server/tests/load-test.ts`)**:
   - Dispatches **10 simultaneous concurrent order requests** competing for the last unit.
   - Summarizes total execution duration, successful orders (1), rejections (9), and verifies final database stock is non-negative.

---

## 4. List of Packages Used & Justifications

### Backend Packages
| Package | Version | Purpose & Rationale |
| :--- | :--- | :--- |
| `express` | `^4.21.2` | Minimal, battle-tested HTTP web framework for REST API routing. |
| `pg` | `^8.13.3` | Native PostgreSQL client (`node-postgres`) providing direct access to raw SQL, connection pooling, and explicit transaction control (`BEGIN`, `COMMIT`, `ROLLBACK`) without ORM overhead. |
| `socket.io` | `^4.8.1` | Reliable real-time bi-directional WebSocket engine with room abstractions (`room:kitchen`, `room:order:<id>`) and automatic reconnection fallbacks. |
| `zod` | `^3.24.2` | Strict runtime TypeScript schema validation for HTTP payloads, ensuring client request integrity before touching the database. |
| `dotenv` | `^16.4.7` | Secure environment variable configuration loader. |
| `cors` | `^2.8.5` | Cross-Origin Resource Sharing middleware for Vite frontend communication. |
| `tsx` | `^4.19.3` | High-performance TypeScript execution tool for fast local development, migrations, and scripts without slow compile steps. |
| `vitest` | `^3.0.7` | Modern, native TypeScript testing framework for fast automated test suites. |
| `supertest` | `^7.0.0` | HTTP assertion library for end-to-end integration testing. |

### Frontend Packages
| Package | Version | Purpose & Rationale |
| :--- | :--- | :--- |
| `react` | `^19.2.8` | Declarative component UI library for reactive state rendering. |
| `react-dom` | `^19.2.8` | DOM rendering layer for React. |
| `react-router-dom`| `^7.x` | Client-side routing between Customer Menu (`/`), Kitchen Board (`/kitchen`), and Order Tracking (`/order/:id`). |
| `socket.io-client`| `^4.8.1` | Real-time event listener keeping the frontend synchronized with backend database commits. |
| `vite` | `^8.3.4` | Fast frontend build tool and dev server with instant Hot Module Replacement (HMR). |

---

## 5. Assumptions Made During Development

1. **Single Restaurant Kitchen**: The assignment represents a live food operations environment for a single kitchen hub; all kitchen operators work from a shared dispatch queue.
2. **Payment Processing**: Payment is assumed to be authorized and settled synchronously as part of the order placement command.
3. **Stock Scope**: Stock deductions occur immediately upon order placement (`NEW`) rather than when cooking starts, preventing orders from entering the kitchen queue without guaranteed physical ingredients.
4. **Active Order Persistence**: An active order is saved in `localStorage` for quick tracking access until it reaches terminal states (`PICKED_UP` or `CANCELLED`), at which point it is automatically cleared.
5. **No Negative Stock Under Any Condition**: It is assumed that items cannot be oversold under back-order agreements; stock must strictly respect the invariant `stock >= 0`.

---

## 6. Testing & Verification Guide

### Run Automated Integration Tests:
```bash
npm test --workspace=server
```
*Observed Output:*
```text
 ✓ tests/integration.test.ts (5 tests) 722ms
   ✓ GET /api/menu returns seeded items including item with stock=1
   ✓ POST /api/orders enforces idempotency via clientRequestId
   ✓ Rejects order and rolls back if requested quantity exceeds stock
   ✓ Strictly prevents overselling in concurrent requests for the item with stock=1
   ✓ Handles Kitchen Status Transitions correctly (NEW -> COOKING -> READY -> PICKED_UP)

 Test Files  1 passed (1)
      Tests  5 passed (5)
```

### Run Concurrency Load-Test Script:
```bash
npm run test:load --workspace=server
```
*Observed Output:*
```text
===========================================================
⚡ Starting Concurrent Order Load & Oversell Protection Test
🎯 Target API: http://localhost:4000/api
===========================================================

📌 Target Item: "Artisan Wagyu Cheeseburger"
📦 Initial Live Stock: 1

🚀 Dispatching 10 simultaneous orders competing for stock...

--- Load Test Results ---
⏱️ Total Time: 58ms
✅ Successful Orders (201): 1
❌ Rejected for Insufficient Stock (409): 9
⚠️ Unexpected Errors: 0

📦 Final Live Stock: 0
🛡️ INVARIANT VERIFIED: Stock is non-negative and overselling was prevented!
```

---

## 7. Step-by-Step Video Demonstration Script

Follow these steps to record the required demonstration video:

1. **Window Setup**:
   - Place two browser windows side-by-side:
     - **Window A (Left)**: Customer 1 at `http://localhost:5173`
     - **Window B (Right Top)**: Customer 2 at `http://localhost:5173`
     - **Window C (Right Bottom)**: Kitchen Screen at `http://localhost:5173/kitchen`
2. **Demonstrating Stock Contention (1 Unit Left)**:
   - If the *Artisan Wagyu Cheeseburger* is out of stock, click the **`🔄 Reset Demo Stock (1)`** button in the top navbar. Both customer windows will instantly show **"⚡ ONLY 1 LEFT!"**.
   - In **Customer 1**: Click `+ Add` to add the Wagyu Burger to cart, open cart, enter name `"Customer 1"`.
   - In **Customer 2**: Click `+ Add` to add the Wagyu Burger to cart, open cart, enter name `"Customer 2"`.
   - Click **Place Order** on Customer 1 first.
   - Instantly click **Place Order** on Customer 2.
3. **Observing the Result**:
   - **Customer 1** succeeds (201) and redirects to the **Live Order Tracking** progress page.
   - **Customer 2** receives the clear notification:
     *`⚠️ Insufficient stock for "Artisan Wagyu Cheeseburger". Requested: 1, Available: 0`*
   - Across all windows, the Wagyu burger badge immediately flips to **"OUT OF STOCK"** without any page refresh.
4. **Demonstrating Kitchen State Progression**:
   - Look at **Window C (Kitchen Board)**: Customer 1's order appears in **"Incoming Orders (NEW)"** with an active waiting timer.
   - Click **"Start Cooking 🍳"** ➔ Moves ticket to **COOKING**. Observe Customer 1's tracking progress bar advance to Step 2 in real time!
   - Click **"Mark Ready 🛎️"** ➔ Moves ticket to **READY**. Observe Customer 1 advance to Step 3.
   - Click **"Complete Picked Up ✅"** ➔ Moves ticket to **COMPLETED**.
   - Return to Customer 1's menu: notice the active order tracker cleanly completes and disappears!
