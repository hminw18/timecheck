import { useState, useCallback } from 'react';

// Common dialog state management hook
const useScheduleDialog = () => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);

  const openDialog = useCallback((dialogData = null) => {
    setData(dialogData);
    setOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setOpen(false);
    setData(null);
  }, []);

  return {
    dialogOpen: open,
    dialogData: data,
    openDialog,
    closeDialog
  };
};

export default useScheduleDialog;