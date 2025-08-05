# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TimeCheck is a React-based web application for group scheduling coordination. Users can create events, share availability, and find optimal meeting times. The app is built with Create React App and uses Firebase for authentication and data storage.

### Core Features
- **Guest Mode**: Users can participate without logging in (name-only)
- **Instant Participation**: View group availability and mark times immediately
- **Calendar Integration**: Google Calendar and Apple Calendar support
- **Fixed Schedule**: Recurring weekly unavailable times (sleep, work)
- **Three Availability States**: Available (default), Unavailable, If Needed

## Commands

### Development
```bash
npm start          # Run development server on localhost:3000
npm start:network  # Run development server accessible on network
npm run build      # Build for production to build folder
npm test           # Run tests in interactive watch mode
```

### Firebase Cloud Functions
```bash
cd functions
npm install        # Install cloud function dependencies
npm run serve      # Run functions locally with emulator
npm run shell      # Interactive shell for testing functions
npm run deploy     # Deploy functions to Firebase
```

### Deployment
```bash
npm run deploy:config     # Deploy configuration
npm run deploy:production # Build and deploy to Firebase Hosting
```

## Architecture

### Tech Stack
- **Frontend**: React 19.1 with Material-UI (MUI) v7.2.0 components
- **Routing**: React Router v7.6.3
- **Backend**: Firebase v11.10.0 (Firestore database, Authentication, Cloud Functions)
- **Date/Time**: Day.js v1.11.13 and date-fns v4.1.0
- **Calendar Integration**: 
  - Google Calendar API (@react-oauth/google v0.12.2)
  - Apple Calendar (tsdav v2.1.5 for CalDAV)
- **Build Tools**: react-app-rewired v2.2.1 for webpack customization
- **Styling**: MUI theme system with custom CSS

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── common/         # Shared schedule components (ScheduleCell, etc.)
│   ├── FixedSchedule.js
│   ├── GroupSchedule.js
│   ├── MySchedule.js
│   └── ParticipantsList.js
├── config/             # Configuration files
│   └── firebase.js     # Firebase initialization
├── contexts/           # React Context providers
│   ├── AuthContext.js  # Authentication state management
│   └── GoogleOAuthContext.js
├── hooks/              # Custom React hooks
│   ├── useEventData.js # Core event data management
│   └── useCalendarIntegration.js
├── pages/              # Route-level components
│   ├── HomePage.js     # Event creation
│   ├── EventPage.js    # Event participation
│   ├── MyEventsPage.js # User's events list
│   └── SettingsPage.js # Calendar & fixed schedule
├── services/           # External service integrations
│   ├── googleCalendar.js
│   └── appleCalendar.js
├── styles/             # CSS stylesheets
│   └── schedule.css    # Optimized schedule styling
└── utils/              # Utility functions
    └── timeUtils.js    # Date/time helpers
```

### Key Architectural Patterns

1. **Context-based State Management**
   - `AuthContext` manages authentication state (Firebase + Google OAuth + Guest mode)
   - `GoogleOAuthContext` handles Google OAuth flow
   - Provides unified user state across the app

2. **Custom Hook Pattern**
   - `useEventData` centralizes all event-related data fetching and state management
   - Handles Firestore subscriptions, schedule updates, and event creation
   - Supports both authenticated and guest users
   - Manages real-time updates via Firestore listeners

3. **Component Structure**
   - **Layout**: Wraps all pages with consistent navigation
   - **Pages** (`src/pages/`): Route-level components
     - HomePage: Event creation (login required)
     - EventPage: Event participation (guest-friendly)
     - MyEventsPage: User's created events (login required)
     - SettingsPage: Calendar integration + fixed schedule (login required)
   - **Components** (`src/components/`): Reusable UI components
     - MySchedule: Personal availability editor with drag selection
     - GroupSchedule: Aggregated availability heatmap
     - FixedSchedule: Weekly recurring schedule
     - ParticipantsList: Event participants display
     - common/ScheduleCell: Base cell component for all schedules

4. **Data Model**
   ```
   events/{eventId}/
     - title, startDate, endDate, ownerId, startTime, endTime
     - createdAt, updatedAt
     availabilities/{userId or guestId}/
       - unavailable: string[] // "YYYY-MM-DD-HH:mm" format
       - ifNeeded: string[]
       - displayName, photoURL, userId
       - isGuest: boolean
       - updatedAt
   
   fixedSchedules/{userId}/
     - schedule: string[] // "Day-HH:mm" format (e.g., "Monday-09:00")
     - updatedAt
   ```

5. **Firebase Configuration**
   - **Database**: Firestore database "timecheck2" in nam5 region
   - **Functions**: Node.js 18 runtime in asia-northeast3 region
   - **Security Rules**: Support guest participation without authentication
   - **Emulator Support**: Full local development with Firebase emulators
   - Environment variables required in `.env.local` for Firebase config

## Environment Setup

Create `.env.local` with Firebase configuration:
```
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_FIREBASE_MEASUREMENT_ID=
```

## Key Features Implementation

### Authentication & Access
- **Guest Mode**: Name-only participation without account creation
  - Guest IDs: `guest_{name}_nopass`
  - Data persists across sessions with same name
  - No authentication required for viewing/participating
- **Google Sign-In**: Full features with cross-device sync
- **Navigation**: Sign-in button in top-right corner

### Availability Selection
- **Drag Selection**: Rectangle selection like FixedSchedule
  - Mouse down → drag → release to select area
  - Preview before applying changes
  - Optimized CSS for performance (will-change, contain)
- **Three States**: 
  - Available (blue) - default
  - Unavailable (red)
  - If Needed (yellow)
- **Instant Access**: Non-logged users can mark times immediately

### Calendar Integration
- **Google Calendar**: OAuth 2.0, imports busy times
- **Apple Calendar**: App-specific password authentication via CalDAV
- **Guest Support**: Calendar import available after initial save
- **UI**: Buttons in My Availability header
- **Credential Storage**: Encrypted in Cloud Functions

### UI/UX Consistency
- **Fixed Cell Sizes**: 40px × 32px across all schedules
- **Unified Navigation**: Same header on all pages via Layout component
- **Material-UI Theme**: Custom theme with Inter font family
- **Page Layouts**:
  - EventPage: 3-column (My Schedule | Participants | Group Schedule)
  - SettingsPage: 2-column centered (Calendar Integration | Fixed Schedule)
- **Performance**: CSS optimizations for smooth drag interactions

### Fixed Schedule
- **Weekly Recurring**: Set regular unavailable times
- **Auto-Apply**: New events inherit fixed schedule
- **Visual Feedback**: Grey cells for fixed times
- **Storage**: Separate Firestore collection

## Build Configuration

### Webpack Customization (config-overrides.js)
- Handles .mjs file imports
- Provides Node.js polyfills for browser environment
- Custom build step copies privacy-policy.html to build folder

### Firebase Deployment
- **Hosting**: Single-page app configuration with clean URLs
- **Functions**: Separate deployment to Cloud Functions
- **Security**: Rate limiting on authentication attempts
- **Caching**: Long cache for static assets, no cache for index.html

## Development Tips

### Working with Schedules
- Schedule components share common ScheduleCell base component
- Time slots are 30-minute intervals (48 per day)
- Dates stored as "YYYY-MM-DD-HH:mm" strings for consistency
- Fixed schedules use "Day-HH:mm" format (e.g., "Monday-09:00")

### Real-time Updates
- useEventData hook manages all Firestore listeners
- Availability updates are debounced to reduce writes
- Guest data persists using localStorage name matching

### Testing Considerations
- No existing tests - consider adding when modifying core functionality
- Firebase emulator available for local testing
- Test with both authenticated and guest users
- Verify drag selection performance with large date ranges