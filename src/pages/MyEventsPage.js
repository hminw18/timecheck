import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Box, Typography, List, ListItem, ListItemText, IconButton, CircularProgress, Button, Divider, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import dayjs from '../config/dayjsConfig';

const MyEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, eventId: null, eventTitle: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();

  const getDayNames = (days) => {
    const dayMap = {
      'Mon': '월',
      'Tue': '화',
      'Wed': '수',
      'Thu': '목',
      'Fri': '금',
      'Sat': '토',
      'Sun': '일'
    };
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Sort days according to the correct order
    const sortedDays = days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    return sortedDays.map(day => dayMap[day] || day);
  };

  useEffect(() => {
    const fetchEvents = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(db, 'events'), where('ownerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const userEvents = await Promise.all(querySnapshot.docs.map(async (eventDoc) => {
          const eventData = { id: eventDoc.id, ...eventDoc.data() };
          
          // Get participant count
          const availabilitiesSnapshot = await getDocs(collection(db, 'events', eventDoc.id, 'availabilities'));
          eventData.participantCount = availabilitiesSnapshot.size;
          
          return eventData;
        }));
        
        // Sort by createdAt in descending order (newest first)
        userEvents.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });
        setEvents(userEvents);
      } catch (error) {
        // Console statement removed for productionsetSnackbar({ open: true, message: 'Could not fetch your events. Please try again.', severity: 'error' });
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const handleDeleteClick = (eventId, eventTitle) => {
    setDeleteDialog({ open: true, eventId, eventTitle });
  };

  const handleDeleteConfirm = async () => {
    const { eventId } = deleteDialog;
    setDeleteDialog({ open: false, eventId: null, eventTitle: '' });
    
    try {
      // First, delete all documents in the 'availabilities' subcollection
      const availabilitiesRef = collection(db, 'events', eventId, 'availabilities');
      const availabilitiesSnapshot = await getDocs(availabilitiesRef);
      const deletePromises = [];
      availabilitiesSnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      await Promise.all(deletePromises);

      // Then, delete the event document itself
      await deleteDoc(doc(db, 'events', eventId));

      setEvents(events.filter(event => event.id !== eventId));
      setSnackbar({ open: true, message: '이벤트가 삭제되었습니다.', severity: 'success' });
    } catch (error) {
      // Console statement removed for productionsetSnackbar({ open: true, message: '이벤트 삭제에 실패했습니다. 다시 시도해 주세요.', severity: 'error' });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, eventId: null, eventTitle: '' });
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ maxWidth: '800px', mx: 'auto', mt: 4 }}>
        <Typography variant="h5" component="h1" sx={{ mt: 4, mb: 2, fontWeight: 'bold' }}>
          내 이벤트
        </Typography>

        
        
        {events.length > 0 ? (
        <List sx={{ bgcolor: 'background.paper' }}>
          {events.map((event, index) => (
            <React.Fragment key={event.id}>
              <ListItem 
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(event.id, event.title);
                  }}>
                    <DeleteIcon />
                  </IconButton>
                }
                sx={{ 
                  '&:hover': { 
                    bgcolor: 'action.hover',
                    cursor: 'pointer'
                  },
                  py: 2
                }}
                onClick={() => navigate(`/event/${event.id}`)}
              >
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h6">{event.title}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {event.participantCount || 0}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {event.eventType === 'day' && event.selectedDays ? (
                          <>요일: {getDayNames(event.selectedDays).join(', ')}</>
                        ) : (
                          <>{event.startDate}부터 {event.endDate}</>
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.createdAt ? dayjs(event.createdAt).format('YYYY년 M월 D일 생성') : ''}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {index < events.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      ) : (
        <Box sx={{ textAlign: 'left', mt: 6 }}>
          <Typography color="text.secondary">
            아직 생성한 이벤트가 없습니다.
          </Typography>
          </Box>
        )}
      </Box>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          이벤트 삭제
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
             "{deleteDialog.eventTitle}"를 삭제하시겠습니까?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>취소</Button>
          <Button onClick={handleDeleteConfirm} autoFocus color="error">
            확인
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ bottom: { xs: 16, sm: 24 }, left: { xs: 16, sm: 24 } }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%', maxWidth: 400 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default MyEventsPage;
