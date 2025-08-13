import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../config/firebase';

const functions = getFunctions(app, 'asia-northeast3');

class AppleCalendarService {
  constructor() {
    this.connectFunction = httpsCallable(functions, 'appleCalendarConnect');
    this.getEventsFunction = httpsCallable(functions, 'appleCalendarGetEvents');
    this.disconnectFunction = httpsCallable(functions, 'appleCalendarDisconnect');
    this.createEventFunction = httpsCallable(functions, 'createAppleCalendarEvent');
  }

  async connect(appleId, appSpecificPassword) {
    try {
      const result = await this.connectFunction({ appleId, appSpecificPassword });
      
      if (result.data.success) {
        return { 
          success: true, 
          connectionId: result.data.connectionId 
        };
      }
      
      return { success: false, error: 'Connection failed' };
    } catch (error) {
      // Apple Calendar connection error
      let errorMessage = 'Failed to connect to Apple Calendar';
      
      if (error.code === 'unauthenticated') {
        errorMessage = 'Invalid Apple ID or app-specific password';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  async disconnect() {
    try {
      const result = await this.disconnectFunction();
      return result.data.success;
    } catch (error) {
      throw error;
    }
  }

  async getEvents(startDate, endDate) {
    try {
      const result = await this.getEventsFunction({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      return result.data.events.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
        title: event.summary,
        isRecurring: event.isRecurring || false,
        recurrenceRule: event.recurrenceRule || null
      }));
    } catch (error) {
      // Error fetching events
      
      if (error.code === 'not-found') {
        throw new Error('Apple Calendar not connected. Please connect first.');
      }
      
      throw error;
    }
  }

  // Create calendar event
  async createEvent(title, timeSlots, eventType, selectedDays) {
    try {
      const result = await this.createEventFunction({
        title,
        timeSlots,
        eventType,
        selectedDays
      });
      return result.data;
    } catch (error) {
      throw error;
    }
  }

  // Connection status is managed by AuthContext, not here
}

export default new AppleCalendarService();