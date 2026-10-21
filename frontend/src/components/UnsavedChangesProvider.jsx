import { createContext, useContext, useEffect, useId, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

const UnsavedChangesContext = createContext(null);

export function useUnsavedChanges(dirty) {
  const register = useContext(UnsavedChangesContext);
  const id = useId();
  useEffect(() => {
    register(id, Boolean(dirty));
    return () => register(id, false);
  }, [register, id, dirty]);
}

export default function UnsavedChangesProvider({ children }) {
  const [guards, setGuards] = useState({});
  const [register] = useState(() => (id, dirty) => {
    setGuards((previous) => {
      if (Boolean(previous[id]) === dirty) return previous;
      const next = { ...previous };
      if (dirty) next[id] = true;
      else delete next[id];
      return next;
    });
  });
  const dirty = Object.values(guards).some(Boolean);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && (
    currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search
  ));

  useEffect(() => {
    if (!dirty) return undefined;
    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const stay = () => { if (blocker.state === 'blocked') blocker.reset(); };
  return <UnsavedChangesContext.Provider value={register}>
    {children}
    <Dialog open={blocker.state === 'blocked'} onClose={stay} maxWidth="xs" fullWidth>
      <DialogTitle>Discard unsaved changes?</DialogTitle>
      <DialogContent>
        <DialogContentText>Your unsaved changes will be lost if you leave this page.</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={stay}>Keep Editing</Button>
        <Button variant="contained" sx={{ bgcolor: '#A22', '&:hover': { bgcolor: '#8b1c1c' } }} onClick={() => {
          if (blocker.state === 'blocked') blocker.proceed();
        }}>Discard</Button>
      </DialogActions>
    </Dialog>
  </UnsavedChangesContext.Provider>;
}
