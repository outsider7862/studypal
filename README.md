# StudyPal 📚

A smart academic planner for university students. Add your courses, schedule quizzes and exams, track study topics, and get weekend reminders so you never miss a deadline.

**Tech Stack:** React Native · Expo · SQLite · Expo Notifications

---

## Features

- **Course Management** — Add courses with name, code, instructor, credits, and a unique color
- **Event Tracking** — Schedule quizzes, assignments, midterms, finals, labs, and presentations
- **Class Timetable** — Add weekly class times (day, start/end, room) per course; see them laid out in a weekly Timetable view with today highlighted
- **Topic Checklists** — Break each event into study topics with estimated hours; check them off as you go
- **Study Progress** — Visual progress bars showing how many topics you've covered per event
- **Mark as Done** — Complete an event to move it out of your upcoming list (and stop its reminders)
- **Urgency Indicators** — Color-coded badges: rose (≤3 days), amber (4–7 days), emerald (7+ days)
- **Calendar View** — Monthly calendar with colored event dots (past & upcoming); swipe left/right to change month; tap a day to see its events
- **Gesture Controls** — Swipe a course, event, or topic to delete; swipe to mark done/undo; swipe the calendar to change months
- **Weekend Alerts** — Automatic reminders every Friday at 7 PM listing what you need to study
- **Event Reminders** — 24-hour and 2-hour reminders before each exam
- **Class Reminders** — Optional weekly notification 15 minutes before each class
- **Dark / Light Mode** — Toggle between Deep Ocean dark theme and a clean light theme
- **Offline First** — Everything stored locally with SQLite, no internet required

---

## Screens

| Screen | Description |
|---|---|
| Today | Upcoming events timeline + course strip |
| Calendar | Monthly grid with event dots and day detail; swipe to change month |
| Timetable | Weekly class schedule — today's classes + a full-week grid |
| Courses | Course list with progress; add/delete courses (swipe to delete) |
| Course Detail | Class times + events for a course; add/edit/delete both |
| Event Detail | Topic checklist with study progress |
| Alerts | Weekend study reminders grouped by urgency |

---

## Getting Started

### 1. Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (for testing), OR Android Studio for emulator

### 2. Install

```bash
git clone <your-repo>
cd studypal
npm install
```

### 3. Run

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `a` for Android emulator.

---

## Building the APK

### Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Configure build
```bash
eas build:configure
```

### Build APK (Android)
```bash
eas build --platform android --profile preview
```

This produces a `.apk` file you can install directly on your phone.

For a release build (signed, for Play Store):
```bash
eas build --platform android --profile production
```

---

## Project Structure

```
studypal/
├── App.js                          ← Entry point
├── app.json                        ← Expo config
├── src/
│   ├── constants/
│   │   ├── theme.js                ← Colors, typography, event/urgency helpers
│   │   └── ThemeContext.js         ← Dark/light mode context + toggle
│   ├── database/
│   │   └── db.js                   ← SQLite schema + all CRUD operations
│   ├── navigation/
│   │   └── AppNavigator.js         ← Bottom tabs + stack navigators
│   ├── components/
│   │   └── UI.js                   ← Shared components (Card, Button, Checkbox, etc.)
│   ├── screens/
│   │   ├── HomeScreen.js           ← Today dashboard
│   │   ├── CalendarScreen.js       ← Monthly calendar
│   │   ├── CoursesScreen.js        ← Course list
│   │   ├── CourseDetailScreen.js   ← Events per course
│   │   ├── EventDetailScreen.js    ← Topics per event
│   │   └── AlertsScreen.js         ← Study reminders
│   └── utils/
│       └── notifications.js        ← Expo push notification helpers
```

---

## Color Palette — Deep Ocean

| Token | Value | Use |
|---|---|---|
| `bg` | `#0F1B2D` | Page background |
| `surface` | `#162032` | Cards |
| `sky` | `#38BDF8` | Primary accent, tabs |
| `violet` | `#7C3AED` | Midterms, topic pills |
| `rose` | `#F43F5E` | Urgent events (≤3 days) |
| `amber` | `#F59E0B` | Soon events (4–7 days) |
| `emerald` | `#10B981` | Comfortable (7+ days) |

---

## Database Schema

```sql
courses          (id, name, code, instructor, credits, color, semester)
events           (id, course_id, title, type, date, time, venue, weightage, notes, completed)
topics           (id, event_id, title, estimated_hours, completed, order_index)
class_schedules  (id, course_id, weekday, start_time, end_time, room, reminder)
```

All data is stored locally in `studypal.db` via Expo SQLite.
