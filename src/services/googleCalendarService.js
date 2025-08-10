import { getFunctions, httpsCallable } from 'firebase/functions';

class GoogleCalendarService {
  constructor() {
    this.functions = getFunctions(undefined, 'asia-northeast3');
    this.exchangeCodeFunction = httpsCallable(this.functions, 'googleCalendarExchangeCode');
    this.refreshTokenFunction = httpsCallable(this.functions, 'googleCalendarRefreshToken');
    this.getEventsFunction = httpsCallable(this.functions, 'getGoogleCalendarEvents');
    this.disconnectFunction = httpsCallable(this.functions, 'googleCalendarDisconnect');
    this.checkStatusFunction = httpsCallable(this.functions, 'googleCalendarCheckStatus');
    this.createEventFunction = httpsCallable(this.functions, 'createGoogleCalendarEvent');
  }

  // Exchange authorization code for tokens
  async exchangeCode(code) {
    try {
      const result = await this.exchangeCodeFunction({ code });
      return result.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Refresh access token
  async refreshToken() {
    try {
      const result = await this.refreshTokenFunction();
      return result.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Check connection status
  async checkConnectionStatus() {
    try {
      const result = await this.checkStatusFunction();
      return result.data;
    } catch (error) {
      return { connected: false };
    }
  }

  // Get calendar events (secure - no access token needed)
  async getEvents(startDate, endDate, eventType, startTime, endTime, selectedDays) {
    try {
      const result = await this.getEventsFunction({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        eventType,
        startTime,
        endTime,
        selectedDays
      });
      return result.data.events || [];
    } catch (error) {
      throw error;
    }
  }

  // Disconnect Google Calendar
  async disconnect() {
    try {
      const result = await this.disconnectFunction();
      return result.data.success;
    } catch (error) {
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
}

const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService;