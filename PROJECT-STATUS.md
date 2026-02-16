# Fitness Tracker — Project Status

> Last updated: February 16, 2026 (Phase 8 complete)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| Backend | Node.js + Express 4.21 |
| Database | MySQL (mysql2 3.12 — promise-based pool) |
| Auth | JWT (jsonwebtoken 9.0) + bcrypt 5.1 |
| PWA | Service Worker, Web App Manifest, LocalStorage offline fallback |

No frontend framework — the entire UI is hand-rolled with modals, a rolling calendar, progress bars, and a real-time activity feed.

---

## Project Structure

```
fitness-tracker/
├── index.html              # Single-page app (auth overlay + dashboard)
├── app.js                  # All frontend logic (~21 KB)
├── api.js                  # Fetch wrapper with JWT auth headers
├── styles.css              # Responsive CSS (gradients, grid, flexbox)
├── sw.js                   # Service worker (cache-first static, network-first API)
├── manifest.json           # PWA manifest
├── admin.html              # Admin dashboard page
├── admin.js                # Admin frontend logic
├── FEATURES.md             # Full feature list
├── generate-icons.js       # Pure-JS PNG icon generator (no deps)
├── generate-icons.html     # HTML helper for icon generation
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon.svg
└── server/
    ├── server.js           # Express entry point (API + static serving, 10mb body limit)
    ├── database.js         # MySQL connection pool
    ├── schema.sql          # Full database schema (10 tables)
    ├── package.json        # Server dependencies
    ├── .env                # DB creds, JWT secret, port
    ├── middleware/
    │   ├── auth.js         # JWT verification middleware
    │   └── adminAuth.js    # Admin privilege check middleware
    └── routes/
        ├── auth.js         # Signup / login
        ├── profile.js      # User profile CRUD
        ├── logs.js         # Daily logs (water, meals, gym, runs)
        ├── weight.js       # Weight tracking
        ├── presets.js      # Meal preset CRUD
        ├── exercises.js    # Exercise library upsert/delete
        ├── photos.js       # Progress photo upload/view/delete
        └── admin.js        # Admin user management & activity feed
```

---

## Database Schema

Ten tables with foreign-key constraints and CASCADE deletes:

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | Auto-increment |
| username | VARCHAR UNIQUE | |
| password_hash | VARCHAR | bcrypt, 10 rounds |
| current_weight | DECIMAL | |
| goal_weight | DECIMAL | |
| start_weight | DECIMAL | |
| calorie_goal | INT | Auto-calculated from TDEE |
| best_streak | INT | |
| is_admin | BOOLEAN | |
| created_at | TIMESTAMP | |

### `daily_logs`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| user_id | FK → users | |
| log_date | DATE | UNIQUE per user |
| water | BOOLEAN | Gallon completed? |
| calories | INT | Running total |

### `meals`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| daily_log_id | FK → daily_logs | CASCADE delete |
| name | VARCHAR | |
| calories | INT | |
| timestamp | DATETIME | |

### `gym_sessions`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| daily_log_id | FK → daily_logs | CASCADE delete |
| exercises | TEXT | |
| prs | TEXT | |
| timestamp | DATETIME | |

### `run_sessions`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| daily_log_id | FK → daily_logs | CASCADE delete |
| distance | DECIMAL | |
| pace | VARCHAR | |
| duration | VARCHAR | |
| timestamp | DATETIME | |

### `weight_history`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| user_id | FK → users | |
| weigh_date | DATE | UNIQUE per user |
| weight | DECIMAL(5,1) | |

### `personal_records`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| user_id | FK → users | |
| record_date | DATE | |
| description | VARCHAR | |

### `meal_presets`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| user_id | FK → users | CASCADE delete |
| name | VARCHAR | |
| calories | INT | |
| created_at | TIMESTAMP | |

### `exercises`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| user_id | FK → users | CASCADE delete |
| name | VARCHAR | UNIQUE per user |
| category | ENUM | Push, Pull, Legs, Core, Cardio |
| last_weight | DECIMAL(6,2) | |
| last_reps | INT | |
| last_used | TIMESTAMP | Auto-updates on change |

### `progress_photos`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| user_id | FK → users | CASCADE delete |
| photo_date | DATE | |
| image_data | LONGTEXT | Base64-encoded JPEG |
| notes | TEXT | Optional |
| weight_at_time | DECIMAL(5,1) | Optional |
| created_at | TIMESTAMP | |

---

## API Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Create account (hashes password, returns JWT) |
| POST | `/api/auth/login` | Login (returns JWT, 30-day expiry) |

### Protected (Bearer token required)

**Profile**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/profile` | Get current user profile |
| PUT | `/api/profile` | Update goal weight, calorie goal, best streak |

**Daily Logs**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/logs/:date` | Get a single day (with meals, gym, runs) |
| GET | `/api/logs?from=&to=` | Get a date range |
| PUT | `/api/logs/:date/water` | Toggle water completion |
| POST | `/api/logs/:date/meals` | Add a meal |
| POST | `/api/logs/:date/gym` | Log a gym session |
| POST | `/api/logs/:date/run` | Log a run |
| DELETE | `/api/logs/:date` | Reset an entire day |

**Weight**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/weight` | Log a weigh-in |
| GET | `/api/weight/history` | Last 12 weight entries |

**Meal Presets**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/presets` | List user's meal presets |
| POST | `/api/presets` | Create a preset (name, calories) |
| DELETE | `/api/presets/:id` | Delete a preset (ownership check) |

**Exercise Library**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/exercises` | List exercises grouped by category |
| POST | `/api/exercises` | Upsert exercise (INSERT ... ON DUPLICATE KEY UPDATE) |
| DELETE | `/api/exercises/:id` | Delete an exercise (ownership check) |

**Progress Photos**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/photos` | List photos metadata (no image data) |
| GET | `/api/photos/:id` | Single photo with full base64 image data |
| POST | `/api/photos` | Upload photo (rejects > 7MB) |
| DELETE | `/api/photos/:id` | Delete a photo (ownership check) |

**Admin (Bearer token + admin privilege required)**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all users with summary stats |
| GET | `/api/admin/users/:id` | Full detail for one user (logs, meals, gym, runs, weight) |
| GET | `/api/admin/activity` | Recent activity feed across all users |
| PUT | `/api/admin/users/:id` | Update user (reset password, toggle admin, adjust goals) |
| DELETE | `/api/admin/users/:id` | Delete user account (prevents self-deletion) |

---

## Features Implemented

### Authentication & Users
- Signup / login with hashed passwords
- JWT tokens (30-day expiry)
- Logout
- Per-user weight goals and calorie targets
- Auto-calculated calorie goal based on TDEE (bodyweight × 15 ± 500 for bulk/cut)

### Daily Tracking
- **Water** — toggle gallon completion
- **Calories** — log individual meals, running total
- **Gym** — exercises + personal records per session
- **Running** — distance, pace, duration

### Streak System
- Day is "complete" when 3 of 4 metrics are logged
- Current streak = consecutive complete days counting back from today
- Best streak saved to server

### Weight Progress
- Visual progress bar (start weight → goal weight)
- Supports both bulking and cutting directions
- Last 12 weigh-ins displayed as history
- Percentage progress tracking

### Weekly Calendar
- Rolling 7-day view
- Per-day icons for water, gym, run, calories
- Completion score (X/4)
- Today highlighted

### Data Management
- Export all data to JSON
- Reset day
- Real-time timestamped activity feed

### PWA / Offline
- Installable on mobile and desktop
- Service worker with cache-first (static) and network-first (API) strategies
- Cache version: `fitness-tracker-v2`
- LocalStorage fallback when offline
- Optimistic UI updates with background sync
- Old caches cleaned on activation

### Admin Interface
- Separate admin page (`/admin.html`) with admin-only access
- User overview: cards showing all users with weight, goals, streak, activity status
- User detail view: full profile, weight history chart, recent meals, gym sessions, runs
- Account management: reset password, toggle admin privileges, adjust calorie/weight goals
- Delete user with confirmation (prevents self-deletion, CASCADE cleans related data)
- Cross-user activity feed showing recent meals, workouts, and runs
- Quick stats: total users, active today, active this week, average goal weight
- Admin middleware: double auth chain (JWT + is_admin check)

### Motivation Quotes (Phase 8)
- Daily rotating quote banner between header and stats grid
- 30 curated fitness quotes, date-seeded selection (one per day)
- Gradient background matching app theme

### Meal Presets (Phase 8)
- Save any meal as a reusable preset from the calorie modal
- Quick-add chips appear above meal inputs for one-tap logging
- Delete presets with X button on each chip
- Persisted per-user in database

### Monthly Calendar (Phase 8)
- Full month grid view with prev/next navigation
- Color-coded days by score: gray (0), yellow (1), orange (2), teal (3), green (4)
- Today highlighted with border
- Reuses existing `/api/logs?from=&to=` endpoint

### Exercise Library (Phase 8)
- Auto-populates from logged gym sessions using regex parsing
- Exercises categorized into Push, Pull, Legs, Core, Cardio via keyword matching
- Shows last weight and reps for each exercise
- Tap a chip to insert the exercise into the gym textarea
- Stored via upsert — updates automatically when you log new weights/reps

### Progress Photos (Phase 8)
- Upload photos with client-side canvas compression (800px max, JPEG 0.7 quality)
- Tag with date, weight, and optional notes
- Gallery grid with date/weight labels on each card
- Full-size viewer modal with delete option
- Server rejects images over 7MB, JSON body limit raised to 10MB

### Security
- bcrypt password hashing (10 salt rounds)
- Parameterized SQL queries (no injection)
- JWT verification middleware on all protected routes
- Admin routes protected by additional adminAuth middleware (403 for non-admins)
- XSS prevention via HTML escaping in admin frontend
- UNIQUE constraints prevent duplicate entries

---

## How to Run

### Prerequisites
- Node.js
- MySQL server running

### 1. Create the database

```bash
mysql -u root -p < server/schema.sql
```

### 2. Configure environment

Edit `server/.env`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YourPassword
DB_NAME=fitness_tracker
JWT_SECRET=your-secret-key
PORT=3001
```

### 3. Install dependencies

```bash
cd server
npm install
```

### 4. Start the server

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

### 5. Open the app

Navigate to `http://localhost:3001` — the Express server serves both the API and the static frontend.
