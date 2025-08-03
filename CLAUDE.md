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
npm run build      # Build for production to build folder
npm test           # Run tests in interactive watch mode
```

### Firebase Cloud Functions
```bash
cd functions
npm install        # Install cloud function dependencies
npm run serve      # Run functions locally
npm run deploy     # Deploy functions to Firebase
```

## Architecture

### Tech Stack
- **Frontend**: React 19.1 with Material-UI (MUI) components
- **Routing**: React Router v7
- **Backend**: Firebase (Firestore database, Authentication, Cloud Functions)
- **Date/Time**: Day.js for date manipulation
- **Calendar Integration**: 
  - Google Calendar API (OAuth 2.0)
  - Apple Calendar (CalDAV with app-specific passwords)
- **Styling**: MUI theme system with custom theme configuration

### Key Architectural Patterns

1. **Context-based State Management**
   - `AuthContext` manages authentication state (Firebase + Google OAuth + Guest mode)
   - Provides unified user state across the app

2. **Custom Hook Pattern**
   - `useEventData` centralizes all event-related data fetching and state management
   - Handles Firestore subscriptions, schedule updates, and event creation
   - Supports both authenticated and guest users

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

4. **Data Model**
   ```
   events/{eventId}/
     - title, startDate, endDate, ownerId, startTime, endTime
     availabilities/{userId or guestId}/
       - unavailable: string[] // "YYYY-MM-DD-HH:mm" format
       - ifNeeded: string[]
       - displayName, photoURL, userId
       - isGuest: boolean
   
   fixedSchedules/{userId}/
     - schedule: string[] // "Day-HH:mm" format
   ```

5. **Firebase Configuration**
   - Environment variables required in `.env.local` for Firebase config
   - Firestore security rules in `firestore.rules`
   - Cloud Functions in `functions/` directory for server-side operations

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
- **Google Sign-In**: Full features with cross-device sync
- **Navigation**: Sign-in button in top-right corner

### Availability Selection
- **Drag Selection**: Rectangle selection like FixedSchedule
  - Mouse down → drag → release to select area
  - Preview before applying changes
- **Three States**: 
  - Available (blue) - default
  - Unavailable (red)
  - If Needed (yellow)
- **Instant Access**: Non-logged users can mark times immediately

### Calendar Integration
- **Google Calendar**: OAuth 2.0, imports busy times
- **Apple Calendar**: App-specific password authentication
- **Guest Support**: Calendar import available after initial save
- **UI**: Buttons in My Availability header

### UI/UX Consistency
- **Fixed Cell Sizes**: 40px × 32px across all schedules
- **Unified Navigation**: Same header on all pages via Layout component
- **Material-UI Theme**: Consistent colors and styles
- **Page Layouts**:
  - EventPage: 3-column (My Schedule | Participants | Group Schedule)
  - SettingsPage: 2-column centered (Calendar Integration | Fixed Schedule)

### Fixed Schedule
- **Weekly Recurring**: Set regular unavailable times
- **Auto-Apply**: New events inherit fixed schedule
- **Visual Feedback**: Grey cells for fixed times