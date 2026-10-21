import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function RejectFreightDialog({ open, reason, loading, onClose, onReasonChange, onSubmit }) {
  return (
      <Dialog
        open={open}
        onClose={loading ? undefined : onClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          Reject Freight
          <IconButton
            disabled={loading} onClick={onClose}
            size="small"
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 13, mb: 1 }}>
            Reason for Rejection <span style={{ color: "red" }}>*</span>
          </Typography>
          <TextField
            multiline
            rows={3}
            fullWidth
            size="small"
            disabled={loading} value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Enter reason for rejection"
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onClose}
            disabled={loading}
            sx={{ textTransform: "none", color: "#333", borderColor: "#aaa" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={!reason.trim() || loading}
            onClick={onSubmit}
            sx={{ bgcolor: '#A22', color: '#fff', textTransform: 'none', minWidth: 80, px: 1.5, fontSize: 12, '&:hover': { bgcolor: '#8b1c1c' }, height: 32 }}
          >
            {loading ? (
              <>
                <CircularProgress size={16} sx={{ color: "white", mr: 1 }} />
                Rejecting...
              </>
            ) : (
              "Reject"
            )}
          </Button>
        </DialogActions>
      </Dialog>
  );
}
