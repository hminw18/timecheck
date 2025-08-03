import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { doc, setDoc, getDoc, collection, addDoc, onSnapshot, getDocs } from 'firebase/firestore';
import dayjs from '../config/dayjsConfig';
import { useAuth } from '../contexts/AuthContext';

export const useEventData = (eventId, user) => {
  const [isEventLoading, setIsEventLoading] = useState(true);
  const [eventDetails, setEventDetails] = useState(null);
  const [myUnavailableSchedule, setMyUnavailableSchedule] = useState(new Set());
  const [myIfNeededSchedule, setMyIfNeededSchedule] = useState(new Set());
  const [groupSchedule, setGroupSchedule] = useState(new Map());
  const [totalMembers, setTotalMembers] = useState(0);
  const [respondedUsers, setRespondedUsers] = useState(new Map());
  const [fixedSchedule, setFixedSchedule] = useState([]);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [fixedScheduleLoaded, setFixedScheduleLoaded] = useState(false);

  const navigate = useNavigate();

  const loadFixedSchedule = useCallback(async (currentUser) => {
    if (!currentUser || currentUser.isGuest) {
      setFixedSchedule([]);
      setFixedScheduleLoaded(true);
      return;
    }
    try {
      const docRef = doc(db, "fixedSchedules", currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setFixedSchedule(docSnap.data().schedule || []);
      } else {
        setFixedSchedule([]);
      }
      setFixedScheduleLoaded(true);
    } catch (error) {
      // Error loading fixed schedule
      setFixedSchedule([]);
      setFixedScheduleLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setFixedScheduleLoaded(false); // Reset to false when user logs in
      loadFixedSchedule(user);
    } else {
      // When user logs out, just reset user-specific data, not event details
      setMyUnavailableSchedule(new Set());
      setMyIfNeededSchedule(new Set());
      setFixedSchedule([]);
      setFixedScheduleLoaded(true); // Set to true when user logs out
      // Don't reset groupSchedule, totalMembers, availableWeeks, or respondedUsers
      // as these are event-wide data, not user-specific
    }
  }, [user, loadFixedSchedule]);

  useEffect(() => {
    if (!eventId) {
      setIsEventLoading(false);
      return;
    }
    setIsEventLoading(true);
    const eventDocRef = doc(db, "events", eventId);
    const unsubscribe = onSnapshot(eventDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setEventDetails(docSnap.data());
        setIsEventLoading(false);
      } else {
        setIsEventLoading(false);
        navigate('/', { state: { error: 'Event not found' } });
      }
    });
    return () => unsubscribe();
  }, [eventId, navigate]);

  useEffect(() => {
    if (!eventDetails || !eventId) return;
    
    // Allow guest access - just don't load user schedule if no user
    if (!user) {
      setMyUnavailableSchedule(new Set());
      setMyIfNeededSchedule(new Set());
      // Don't return here - we still need to load group schedule
    }

    const availabilitiesColRef = collection(db, `events/${eventId}/availabilities`);
    const unsubscribeAvailabilities = onSnapshot(availabilitiesColRef, (snapshot) => {
      const newGroupSchedule = new Map();
      const newRespondedUsers = new Map();

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const unavailable = new Set(data.unavailable || []);
        const ifNeeded = new Set(data.ifNeeded || []);
        const userId = data.userId;
        const displayName = data.displayName;
        const photoURL = data.photoURL;

        if (userId && displayName) {
          newRespondedUsers.set(userId, { id: userId, name: displayName, photo: photoURL });
        }

        // Initialize all slots for the group schedule
        if (newGroupSchedule.size === 0) {
            if (eventDetails.eventType === 'day' && eventDetails.selectedDays) {
                // Day-based event: initialize slots for each selected day
                const startHour = parseInt(eventDetails.startTime.split(':')[0]);
                const endHour = parseInt(eventDetails.endTime.split(':')[0]);
                eventDetails.selectedDays.forEach(day => {
                    for(let i = startHour; i < endHour; i++) {
                        // Add both :00 and :30 slots
                        const slot00 = `${day}-${i.toString().padStart(2, '0')}:00`;
                        const slot30 = `${day}-${i.toString().padStart(2, '0')}:30`;
                        newGroupSchedule.set(slot00, { available: { count: 0, users: [] }, ifNeeded: { count: 0, users: [] } });
                        newGroupSchedule.set(slot30, { available: { count: 0, users: [] }, ifNeeded: { count: 0, users: [] } });
                    }
                });
            } else {
                // Date-based event: initialize slots for date range
                const start = dayjs(eventDetails.startDate);
                const end = dayjs(eventDetails.endDate);
                let current = start;
                while(current.isSameOrBefore(end, 'day')) {
                    const startHour = parseInt(eventDetails.startTime.split(':')[0]);
                    const endHour = parseInt(eventDetails.endTime.split(':')[0]);
                    for(let i = startHour; i < endHour; i++) {
                        // Add both :00 and :30 slots
                        const slot00 = `${current.format('YYYY-MM-DD')}-${i.toString().padStart(2, '0')}:00`;
                        const slot30 = `${current.format('YYYY-MM-DD')}-${i.toString().padStart(2, '0')}:30`;
                        newGroupSchedule.set(slot00, { available: { count: 0, users: [] }, ifNeeded: { count: 0, users: [] } });
                        newGroupSchedule.set(slot30, { available: { count: 0, users: [] }, ifNeeded: { count: 0, users: [] } });
                    }
                    current = current.add(1, 'day');
                }
            }
        }

        newGroupSchedule.forEach((_, slotId) => {
            const isUnavailable = unavailable.has(slotId);
            const isIfNeeded = ifNeeded.has(slotId);
            const currentSlotData = newGroupSchedule.get(slotId);

            if (!isUnavailable && !isIfNeeded) {
                currentSlotData.available.count++;
                currentSlotData.available.users.push({ id: userId, name: displayName, photo: photoURL });
            } else if (isIfNeeded) {
                currentSlotData.ifNeeded.count++;
                currentSlotData.ifNeeded.users.push({ id: userId, name: displayName, photo: photoURL });
            }
        });
      });

      setGroupSchedule(newGroupSchedule);
      setRespondedUsers(newRespondedUsers);
      setTotalMembers(newRespondedUsers.size);
      setIsEventLoading(false);
    });

    const loadUserSchedule = async () => {
      if (!user) return; // Skip if no user (guest mode)
      if (!fixedScheduleLoaded) return; // Wait for fixed schedule to load
      
      const userAvailabilityDocRef = doc(db, `events/${eventId}/availabilities`, user.uid);
      const userAvailabilitySnap = await getDoc(userAvailabilityDocRef);
      if (userAvailabilitySnap.exists()) {
        const data = userAvailabilitySnap.data();
        setMyUnavailableSchedule(new Set(data.unavailable || []));
        setMyIfNeededSchedule(new Set(data.ifNeeded || []));
      } else {
        // Start with empty schedule - let EventPage handle calendar and fixed schedule loading
        setMyUnavailableSchedule(new Set());
        setMyIfNeededSchedule(new Set());
      }
    };

    loadUserSchedule();

    return () => {
      unsubscribeAvailabilities();
    };
  }, [eventDetails, eventId, user, fixedSchedule, fixedScheduleLoaded, navigate]);

  useEffect(() => {
    if (eventDetails) {
      // If we have selectedDates, use only weeks that contain selected dates
      if (eventDetails.selectedDates && eventDetails.selectedDates.length > 0) {
        const weeksSet = new Set();
        eventDetails.selectedDates.forEach(date => {
          const weekStart = dayjs(date).startOf('week').format('YYYY-MM-DD');
          weeksSet.add(weekStart);
        });
        const weeks = Array.from(weeksSet).sort();
        setAvailableWeeks(weeks);
      } else {
        // Fallback to old behavior if selectedDates not available
        const start = dayjs(eventDetails.startDate);
        const end = dayjs(eventDetails.endDate);
        const weeks = [];
        let current = start.startOf('week');
        while (current.isSameOrBefore(end, 'week')) {
          weeks.push(current.format('YYYY-MM-DD'));
          current = current.add(1, 'week');
        }
        setAvailableWeeks(weeks);
      }
    }
  }, [eventDetails]);

  const handleCreateEvent = async (details) => {
    setIsEventLoading(true);
    try {
      // Create event with either user ID or anonymous
      const eventData = {
        ...details,
        ownerId: user ? user.uid : `anonymous_${Date.now()}`,
        ownerName: user ? user.displayName : null,
        isGuestEvent: !user,
        createdAt: new Date().toISOString()
      };
      
      // For day-based events, calculate a date range for display (e.g., next 4 weeks)
      if (details.eventType === 'day' && details.selectedDays.length > 0) {
        const today = dayjs();
        eventData.startDate = today.format('YYYY-MM-DD');
        eventData.endDate = today.add(4, 'week').format('YYYY-MM-DD');
      }
      
      const docRef = await addDoc(collection(db, "events"), eventData);
      navigate(`/event/${docRef.id}`);
    } catch (error) {
      // Error creating event
    }
    setIsEventLoading(false);
  };

  const handleSaveFixedSchedule = async (schedule) => {
    if (!user || user.isGuest) {
      return { success: false, error: "You must be logged in to save." };
    }
    try {
      const docRef = doc(db, "fixedSchedules", user.uid);
      await setDoc(docRef, { schedule });
      setFixedSchedule(schedule);
      return { success: true };
    } catch (error) {
      // Error saving fixed schedule
      return { success: false, error: 'Error saving fixed schedule. Please try again.' };
    }
  };

  const handleSave = async (guestUserData = null) => {
    const currentUser = guestUserData || user;
    if (!currentUser || !eventId) return false;
    
    
    try {
      const docId = currentUser.uid || currentUser.id;
      const userAvailabilityDocRef = doc(db, `events/${eventId}/availabilities`, docId);
      
      await setDoc(userAvailabilityDocRef, {
        unavailable: Array.from(myUnavailableSchedule),
        ifNeeded: Array.from(myIfNeededSchedule),
        userId: docId,
        displayName: currentUser.displayName || currentUser.name || currentUser.email || 'User',
        photoURL: currentUser.photoURL || null,
        isGuest: currentUser.isGuest || false,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      // Error saving availability
      return false;
    }
  };

  return {
    isEventLoading,
    eventDetails,
    myUnavailableSchedule,
    setMyUnavailableSchedule,
    myIfNeededSchedule,
    setMyIfNeededSchedule,
    groupSchedule,
    totalMembers,
    respondedUsers,
    fixedSchedule,
    availableWeeks,
    handleCreateEvent,
    handleSaveFixedSchedule,
    handleSave,
  };
};