# Sprint Plan: SQLite Persistence Migration for Alerts & Notification Center

**Lead Architect & Orchestrator**: `/solution-architect-business-planner`  
**Assigned Full-Stack Specialist**: `/bakeiq-fullstack-engineer` (SQLite Schema, Rust Models, Tauri IPC, TS API Bridge)  
**Assigned UI/UX Specialist**: `/frontend-uiux-design-expert` (AppContext Integration, Optimistic State, UI Polish)  
**Assigned QA Specialist**: `qa-automation-tester` (Adversarial E2E Suite, Persistence Verification)  
**Strict Quality Gatekeeper**: `code-reviewer`  
**Sprint Status**: `[COMPLETED & APPROVED] ✅`  

---

## 1. Executive Summary & Architectural Motivation

The notification system currently stores active alerts and informational updates in the browser's `localStorage` (`bakeiq_notifications`). While performant, `localStorage` has architectural limitations:
1. **Excluded from Database Backups**: Notifications and operational alerts are omitted when creating a database backup file (`pricing_calculator_{timestamp}.db`).
2. **Lack of Relational Audit Trail**: Dismissed notifications are discarded with no historical logging or queryable state.
3. **Session Fragility**: Clearing browser cache or switching contexts clears all active alerts.

### Target Architectural State (To-Be)
Migrate notification storage to the core **SQLite relational database** (`pricing_calculator.db`), maintaining sub-millisecond perceived UI responsiveness through optimistic local React updates synchronized with strongly typed Tauri IPC commands.

---

## 2. Technical Contracts & Domain Architecture

### A. SQLite Relational Schema (`src-tauri/src/db.rs`)
```sql
CREATE TABLE IF NOT EXISTS app_notifications (
    id                TEXT PRIMARY KEY,
    notification_type TEXT NOT NULL,         -- 'alert' | 'notification'
    severity          TEXT NOT NULL,         -- 'critical' | 'warning' | 'info' | 'success'
    title             TEXT NOT NULL,
    message           TEXT NOT NULL,
    details           TEXT,
    action_label      TEXT,
    action_url        TEXT,
    created_at        TEXT NOT NULL,         -- ISO 8601 string
    is_read           INTEGER NOT NULL DEFAULT 0,
    is_dismissed      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_app_notifs_active 
ON app_notifications (is_dismissed, created_at DESC);
```

### B. Rust Domain Models & DTOs (`src-tauri/src/models.rs`)
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbNotification {
    pub id: String,
    pub notification_type: String, // 'alert' | 'notification'
    pub severity: String,          // 'critical' | 'warning' | 'info' | 'success'
    pub title: String,
    pub message: String,
    pub details: Option<String>,
    pub action_label: Option<String>,
    pub action_url: Option<String>,
    pub created_at: String,
    pub is_read: bool,
    pub is_dismissed: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateNotificationInput {
    pub id: Option<String>,
    pub notification_type: String,
    pub severity: String,
    pub title: String,
    pub message: String,
    pub details: Option<String>,
    pub action_label: Option<String>,
    pub action_url: Option<String>,
}
```

### C. Tauri IPC Commands (`src-tauri/src/commands.rs` & `src-tauri/src/lib.rs`)
1. `get_active_notifications(state: State<DbState>) -> Result<Vec<DbNotification>, String>`:
   - Queries `SELECT ... FROM app_notifications WHERE is_dismissed = 0 ORDER BY created_at DESC`.
2. `create_notification(state: State<DbState>, input: CreateNotificationInput) -> Result<String, String>`:
   - Inserts or replaces a notification into `app_notifications`. Generates UUID if `id` is not provided.
3. `dismiss_notification(state: State<DbState>, id: String) -> Result<(), String>`:
   - Updates `is_dismissed = 1` for the given ID.
4. `clear_all_notifications(state: State<DbState>) -> Result<(), String>`:
   - Updates `is_dismissed = 1` across all active notifications.
5. Command registration in `lib.rs`.

### D. TypeScript API Bridge (`src/lib/api.ts`)
```typescript
export interface DbNotification {
  id: string;
  notification_type: 'alert' | 'notification';
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  details?: string | null;
  action_label?: string | null;
  action_url?: string | null;
  created_at: string;
  is_read: boolean;
  is_dismissed: boolean;
}

export interface CreateNotificationInput {
  id?: string;
  notification_type: 'alert' | 'notification';
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  details?: string;
  action_label?: string;
  action_url?: string;
}

export async function getActiveNotifications(): Promise<DbNotification[]>;
export async function createDbNotification(input: CreateNotificationInput): Promise<string>;
export async function dismissDbNotification(id: string): Promise<void>;
export async function clearAllDbNotifications(): Promise<void>;
```

### E. Frontend State Synchronization (`src/context/AppContext.tsx`)
- On initial mount: Fetch active notifications asynchronously from `getActiveNotifications()` into `state.notifications`.
- One-Time LocalStorage Migration: If `localStorage.getItem("bakeiq_notifications")` has records, ingest them into SQLite via `createDbNotification`, then remove the localStorage key.
- Optimistic UI updates: Mutate React state immediately for snappy interactions, then execute IPC commands in background with rollback on error.

---

## 3. Work Breakdown Structure (DAG WBS)

```
[Phase 1: Database Migration & Schema] (Assigned to /bakeiq-fullstack-engineer)
  ├── Task 1.1: Add `app_notifications` table & index in `src-tauri/src/db.rs`
  └── Task 1.2: Seed default notifications in `db.rs` if table is empty
                │
                ▼
[Phase 2: Rust Domain & IPC Commands] (Assigned to /bakeiq-fullstack-engineer)
  ├── Task 2.1: Author `DbNotification` & `CreateNotificationInput` in `models.rs`
  ├── Task 2.2: Implement `get_active_notifications`, `create_notification`, `dismiss_notification`, `clear_all_notifications` in `commands.rs`
  ├── Task 2.3: Register new commands in `src-tauri/src/lib.rs`
  └── Task 2.4: Validate backend with `cargo check --tests`
                │
                ▼
[Phase 3: Frontend API & AppContext Migration] (Assigned to /bakeiq-fullstack-engineer & /frontend-uiux-design-expert)
  ├── Task 3.1: Expose typed API wrappers in `src/lib/api.ts`
  ├── Task 3.2: Update `AppContext.tsx` to initialize notifications from SQLite IPC
  ├── Task 3.3: Wire `addNotification`, `dismissNotification`, `clearAllNotifications` to IPC with optimistic local state
  └── Task 3.4: Remove `localStorage` read/write loops in `AppContext.tsx`
                │
                ▼
[Phase 4: Adversarial E2E Verification] (Assigned to qa-automation-tester)
  ├── Task 4.1: Extend Playwright mock IPC handlers in `e2e/notification_center.spec.ts` for SQLite commands
  ├── Task 4.2: Verify notifications persist and reload cleanly from backend
  ├── Task 4.3: Verify dismiss auto-removes notification in SQLite (`is_dismissed = 1`)
  └── Task 4.4: Execute full regression test suite (all 30 tests must pass)
                │
                ▼
[Phase 5: Strict Quality Gatekeeper Review] (Assigned to code-reviewer)
  └── Task 5.1: Zero debug remnants, zero unwrap/expect in Rust, type symmetry between Rust and TS, update `.review_strikes.log`
```

---

## 4. Verification & Testing Protocol

1. **Backend Verification**:
   - `cargo check --tests` passes with 0 errors.
   - Idempotent migration tested on existing database.
2. **Frontend Build & Types**:
   - `npm run build` compiles with 0 errors and zero warnings.
3. **Playwright E2E Suite**:
   - Run `npx playwright test e2e/notification_center.spec.ts`.
   - Run full regression suite `npx playwright test` (all 30 tests passing).
4. **Data Integrity & Backup Verification**:
   - Creating a database backup includes the `app_notifications` table and its records.

---

## 5. Rollback Safety Plan

If abort or rollback is triggered:
- Revert modified files:
  ```powershell
  git restore src-tauri/src/db.rs src-tauri/src/models.rs src-tauri/src/commands.rs src-tauri/src/lib.rs pricing-calculator/src/lib/api.ts pricing-calculator/src/context/AppContext.tsx pricing-calculator/e2e/notification_center.spec.ts
  ```
- Because SQLite table creation uses `CREATE TABLE IF NOT EXISTS`, existing user data is protected against destructive alterations.

---

## 6. Delivery & Verification Sign-Off

- [x] **Phase 1: SQLite Schema & Migrations (`db.rs`)**:
  - `app_notifications` table created with columns `id`, `notification_type`, `severity`, `title`, `message`, `details`, `action_label`, `action_url`, `created_at`, `is_read`, `is_dismissed`.
  - Composite index `idx_app_notifs_active` on `(is_dismissed, created_at DESC)`.
  - Safe seeding with default alert and activity items.
- [x] **Phase 2: Rust Domain Models & Tauri IPC Commands (`models.rs`, `commands.rs`, `lib.rs`)**:
  - `DbNotification` and `CreateNotificationInput` models created.
  - Implemented `get_active_notifications`, `create_notification`, `dismiss_notification`, and `clear_all_notifications` with zero `unwrap()` or `expect()`.
  - Registered commands in Tauri's `invoke_handler`.
- [x] **Phase 3: Frontend TypeScript API & React Context (`api.ts`, `AppContext.tsx`)**:
  - Strongly typed API bridge wrappers authored in `src/lib/api.ts`.
  - Migrated `AppContext.tsx` from `localStorage` to SQLite queries and mutations with optimistic local UI state.
  - Automatic migration and cleanup of legacy `localStorage` entries.
- [x] **Phase 4: Adversarial E2E Verification (`qa-automation-tester`)**:
  - Extended Playwright mock backend in `e2e/notification_center.spec.ts`.
  - Added `TC-NOTIF-06` verifying SQLite persistence across dismiss and create operations.
  - 6/6 notification center tests passed.
  - 31/31 project-wide regression tests passed cleanly.
- [x] **Phase 5: Quality Gatekeeper Sign-Off (`code-reviewer`)**:
  - Backend `cargo check --tests` passed with 0 errors.
  - Frontend `npm run build` compiled with 0 errors.
  - Zero debug remnants (`console.log`, `debugger`, `dbg!`).
  - `.review_strikes.log` approved with 0 strikes.

