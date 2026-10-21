import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

const UnsavedChangesContext = createContext(null);
const MenuNavigationContext = createContext(null);

export function useMenuNavigate() {
  return useContext(MenuNavigationContext);
}

export function useUnsavedChanges(dirty) {
  const register = useContext(UnsavedChangesContext);
  const id = useId();
  useEffect(() => {
    register(id, Boolean(dirty));
    return () => register(id, false);
  }, [register, id, dirty]);
}

export default function UnsavedChangesProvider({ children }) {
  const navigate = useNavigate();
  const menuNavigationRef = useRef(false);
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
  const blocker = useBlocker(() => dirty && menuNavigationRef.current);
  const menuNavigate = (to, options) => {
    menuNavigationRef.current = true;
    try {
      navigate(to, options);
    } finally {
      menuNavigationRef.current = false;
    }
  };

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
    <MenuNavigationContext.Provider value={menuNavigate}>
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
    </MenuNavigationContext.Provider>
  </UnsavedChangesContext.Provider>;
}
