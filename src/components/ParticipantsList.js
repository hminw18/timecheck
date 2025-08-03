import React from 'react';
import { Box, Typography, Avatar, AvatarGroup, Tooltip } from '@mui/material';

const ParticipantsList = ({ respondedUsers }) => {
  const usersArray = Array.from(respondedUsers.values());

  return (
    <Box sx={{ mt: 4, p: 2, border: '1px solid #e0e0e0', borderRadius: '8px' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Participants ({usersArray.length})</Typography>
      {usersArray.length > 0 ? (
        <AvatarGroup max={6}>
          {usersArray.map(user => (
            <Tooltip title={user.name} key={user.id}>
              <Avatar src={user.photo} alt={user.name} />
            </Tooltip>
          ))}
        </AvatarGroup>
      ) : (
        <Typography variant="body2" color="text.secondary">No participants yet.</Typography>
      )}
    </Box>
  );
};

export default ParticipantsList;
