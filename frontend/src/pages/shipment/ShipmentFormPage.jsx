import { useState, useEffect } from 'react';
import {
  Box, Typography, Dialog, DialogTitle, Stack, Button, Divider, IconButton,
  DialogContent
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ErrorBoundary } from 'react-error-boundary';

// shared components
import ErrorFallback from '../../sections/shared/ErrorBoundary';
import { useDispatch, useSelector } from '../../redux/store';
import Iconify from '../../components/iconify';
import SharedHomepageHeader from '../../sections/shared/SharedHomepageHeader';
import SharedSearchField from '../../sections/shared/SharedSearchField';
import ShipmentTabs from './ShipmentTabs';
// import { setSelectedCarrierRowDetails } from '../../redux/slices/carrier';
// import CarrierTable from './CarrierTable';
import ShipmentDetails from './ShipmentDetails';
// ----------------------------------------------------------------------

export default function ShipmentFormPage() {
   const dispatch = useDispatch();
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const logError = (error, info) => {
    // Use an error reporting service here
    console.error("Error caught:", info);
    console.log(error);
  };
  const btnStyle = {
  borderRadius: '4px',
  color: '#fff',
  boxShadow: 'none',
  fontSize: '14px',
  px: 2,
  py: 0.5,
  bgcolor: '#A22',
  fontWeight: 'normal',
  textTransform: 'none',
};
  const onClickOfNewShipment = () => {
    // dispatch(setSelectedCarrierRowDetails({}));
    setOpenConfirmDialog(true);
  }
  const handleCloseConfirm = () => {
    setOpenConfirmDialog(false);
  };
  return (
    <>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={logError}
        onReset={() => {
          // Optional: reset app state here if necessary before retry
          console.log("Error boundary reset triggered");
        }}
      >
        <Box>
          <SharedHomepageHeader title="Shipment Form" buttonText='New Shipment' onButtonClick={onClickOfNewShipment} />
          <ShipmentTabs />
          <SharedSearchField page="shipment" />
          {/* <CarrierTable /> */}
        </Box>
        {/* <Dialog open={openConfirmDialog} onClose={handleCloseConfirm} onKeyDown={(event) => {
          if (event.key === 'Escape') {
            handleCloseConfirm();
          }
        }}
          sx={{
            '& .MuiDialog-paper': { // Target the paper class
              width: '1543px',
              height: '520px',
              maxHeight: 'none',
              maxWidth: 'none',
            }
          }}
        >
          <DialogContent>
            <ShipmentDetails type='Add' handleCloseConfirm={handleCloseConfirm}/>
          </DialogContent>
        </Dialog> */}

          <Dialog 
          open={openConfirmDialog} // control this with state
          onClose={handleCloseConfirm}
          maxWidth="sm"
          fullWidth={false}
        >
          {/* Header */}
          <DialogTitle sx={{ pb: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontSize: '18px', fontWeight: 600 }}>
                Select Shipment
              </Typography>
              {/* <IconButton onClick={handleCloseConfirm}>
                <CloseIcon /> */}
                <Iconify icon="carbon:close" onClick={() => handleCloseConfirm()} sx={{ cursor: 'pointer' }} />
              {/* </IconButton> */}
            </Stack>
            <Divider sx={{ mt: 1 }} />
          </DialogTitle>
        
          {/* Content */}
          <DialogContent>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button variant="contained" size="small" sx={btnStyle}>
                Air Shipment Form
              </Button>
        
              <Button variant="contained" size="small" sx={btnStyle}>
                LCL Shipment Form
              </Button>
        
              <Button variant="contained" size="small" sx={btnStyle}>
                FCL Shipment Form
              </Button>
            </Stack>
          </DialogContent>
        </Dialog>
      </ErrorBoundary>
    </>
  );
}
