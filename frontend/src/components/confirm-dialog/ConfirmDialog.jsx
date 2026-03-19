import PropTypes from 'prop-types';
// @mui
import { Dialog, DialogTitle, DialogActions, DialogContent } from '@mui/material';

// ----------------------------------------------------------------------

ConfirmDialog.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.node,
  action: PropTypes.node,
  content: PropTypes.node,
  onClose: PropTypes.func,
};

export default function ConfirmDialog({ title, content, action, open, onClose, ...other }) {
  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      {...other}
      disableScrollLock
    >
      <DialogTitle sx={{ pb: 2 }}>
        {title}
      </DialogTitle>

      {content && (
        <DialogContent sx={{ typography: 'body2' }}>
          {' '}
          {content}{' '}
        </DialogContent>
      )}

      <DialogActions sx={{ justifyContent: 'flex-start' }}>
        {action}
      </DialogActions>
    </Dialog>
  );
}
