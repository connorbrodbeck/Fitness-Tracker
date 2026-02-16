# Fitness Tracker — Features

## Daily Tracking
- **Water Intake** — One-tap toggle to mark daily gallon complete
- **Calorie Logging** — Log individual meals with name and calories, running daily total vs. goal
- **Gym Sessions** — Free-text workout logging with exercise details, optional PR tracking
- **Running** — Log distance, pace, and duration for each run

## Meal Presets
- Save frequently eaten meals as quick-add presets
- One-tap to instantly log a preset meal with saved calories
- Manage presets directly from the calorie logging modal

## Exercise Library
- Automatically builds from your logged gym sessions
- Exercises categorized by muscle group: Push, Pull, Legs, Core, Cardio
- Shows last weight and reps for each exercise
- Tap any exercise chip to insert it into your workout log

## Progress Tracking
- **Current Streak** — Consecutive days hitting 3 of 4 daily goals (water, calories, gym, running)
- **Best Streak** — All-time record preserved across sessions
- **Weight Journey** — Visual progress bar from start weight to goal weight
- **Weight Chart** — Bar chart of your last 12 weigh-ins

## Calendars
- **Weekly Calendar** — 7-day view with per-day breakdown of all 4 metrics and score
- **Monthly Calendar** — Full month grid with color-coded day scores (gray/yellow/orange/teal/green for 0-4), prev/next month navigation

## Progress Photos
- Upload photos with automatic compression (resized to 800px, JPEG quality 0.7)
- Tag each photo with date, weight, and optional notes
- Gallery view with date and weight labels
- Full-size photo viewer with delete option

## Motivation
- Daily rotating quote banner displayed below the header
- 30 curated fitness motivation quotes, one per day (date-seeded)

## Weight Management
- Log weekly weigh-ins
- Auto-calculated calorie goal based on body weight (TDEE +/- 500 for bulk/cut)
- Dynamic progress bar and journey title that update with your goals

## Data & History
- **Today's Meals** — Itemized list of all meals logged today with timestamps
- **Recent Activity** — Chronological feed of all actions taken
- **Export Data** — Download all tracker data as JSON
- **Reset Today** — Clear the current day's data and start fresh

## User Accounts
- Secure login and signup with JWT authentication
- Per-user data isolation — all logs, presets, exercises, and photos are private
- Password-protected accounts with minimum length enforcement

## Admin Interface
- Dedicated admin dashboard at `/admin.html`
- View and manage all registered users
- Admin-only access controlled by server-side privilege check

## Progressive Web App (PWA)
- Installable on mobile and desktop via "Install App" button
- Service worker for offline capability
- Custom app icons and theme color
- Responsive design optimized for mobile, tablet, and desktop

## Technical Details
- **Frontend**: Vanilla HTML/CSS/JS, no framework dependencies
- **Backend**: Node.js + Express with MySQL database
- **Auth**: JWT tokens with localStorage persistence
- **API**: RESTful endpoints with offline fallback to cached data
- **Photos**: Client-side canvas compression before upload, 7MB server limit
