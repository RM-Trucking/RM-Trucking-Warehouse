import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Dialog, DialogTitle, Stack, Button, Divider, IconButton,
  DialogContent, useMediaQuery, Alert, CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ErrorBoundary } from 'react-error-boundary';

// shared components
import ErrorFallback from '../../sections/shared/ErrorBoundary';
import Iconify from '../../components/iconify';
import SharedHomepageHeader from '../../sections/shared/SharedHomepageHeader';
import SharedSearchField from '../../sections/shared/SharedSearchField';
import ShipmentTabs from './ShipmentTabs';
// import { setSelectedCarrierRowDetails } from '../../redux/slices/carrier';
// import CarrierTable from './CarrierTable';
import ShipmentDetails from './ShipmentDetails';
import NewAirShipmentForm from './AirShipmentForm';
import OceanLCLForm from './OceanLCLForm';
import OceanFCLForm from './OceanFCLForm';
import ShipmentMobileScanPage from './ShipmentMobileScanPage';
import { useDispatch } from '../../redux/store';
import { getShipmentById } from '../../redux/slices/shipment';
// ----------------------------------------------------------------------

export default function ShipmentFormPage() {
  const location = useLocation();

  return <ShipmentFormPageContent key={location.state?.shipmentGridResetKey || 'shipment-form'} />;
}

function ShipmentFormPageContent() {
  const dispatch = useDispatch();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isScanGunScreen = useMediaQuery('(max-width:599.95px)', { noSsr: true });
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [showAirShipmentForm, setShowAirShipmentForm] = useState(false);
  const [showOceanLCLForm, setShowOceanLCLForm] = useState(false);
  const [showOceanFCLForm, setShowOceanFCLForm] = useState(false);
  const [viewShipment, setViewShipment] = useState(null);
  const [viewShipmentError, setViewShipmentError] = useState('');
  const requestedViewShipmentId = searchParams.get('viewShipmentId')
    || location.state?.viewShipment?.shipmentId
    || location.state?.viewShipment?.id
    || '';

  useEffect(() => {
    if (!requestedViewShipmentId) return;
    if (String(viewShipment?.shipmentId || viewShipment?.id || '') === String(requestedViewShipmentId)) return;

    let active = true;
    dispatch(getShipmentById(requestedViewShipmentId)).then((result) => {
      if (!active) return;
      if (!result?.success) {
        setViewShipmentError(result?.error || 'Failed to load shipment details.');
        return;
      }
      setViewShipment({
        ...result.data,
        shipmentId: result.data?.shipmentId || requestedViewShipmentId,
      });
      if (!searchParams.get('viewShipmentId')) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('viewShipmentId', String(requestedViewShipmentId));
        setSearchParams(nextParams, { replace: true });
      }
    });

    return () => {
      active = false;
    };
  }, [dispatch, requestedViewShipmentId, searchParams, setSearchParams, viewShipment]);

  const handleViewShipment = (shipmentData) => {
    const shipmentId = shipmentData?.shipmentId || shipmentData?.id;
    setViewShipment(shipmentData);
    setViewShipmentError('');
    if (shipmentId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('viewShipmentId', String(shipmentId));
      setSearchParams(nextParams);
    }
  };

  const handleCloseViewShipment = () => {
    setViewShipment(null);
    setViewShipmentError('');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('viewShipmentId');
    setSearchParams(nextParams);
  };
  const viewShipmentLoading = Boolean(
    requestedViewShipmentId
    && String(viewShipment?.shipmentId || viewShipment?.id || '') !== String(requestedViewShipmentId)
    && !viewShipmentError
  );
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

  const handleCloseAirShipmentForm = () => {
    setShowAirShipmentForm(false);
  };

  const handleOpenAirShipmentForm = () => {
    setOpenConfirmDialog(false);
    setShowAirShipmentForm(true);
  };

  const handleCloseOceanLCLForm = () => {
    setShowOceanLCLForm(false);
  };

  const handleOpenOceanLCLForm = () => {
    setOpenConfirmDialog(false);
    setShowOceanLCLForm(true);
  };

  const handleCloseOceanFCLForm = () => {
    setShowOceanFCLForm(false);
  };

  const handleOpenOceanFCLForm = () => {
    setOpenConfirmDialog(false);
    setShowOceanFCLForm(true);
  };

  if (viewShipmentLoading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#A22' }} />
      </Box>
    );
  }

  if (isScanGunScreen && !viewShipment && !showAirShipmentForm && !showOceanLCLForm && !showOceanFCLForm) {
    return <ShipmentMobileScanPage />;
  }

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
        {viewShipment?.shipmentType === 'AIR' ? (
          <NewAirShipmentForm handleClose={handleCloseViewShipment} rowData={viewShipment} viewMode />
        ) : viewShipment?.shipmentType === 'LCL' ? (
          <OceanLCLForm handleClose={handleCloseViewShipment} rowData={viewShipment} viewMode />
        ) : viewShipment?.shipmentType === 'FCL' ? (
          <OceanFCLForm handleClose={handleCloseViewShipment} rowData={viewShipment} viewMode />
        ) : showAirShipmentForm ? (
          <NewAirShipmentForm handleClose={handleCloseAirShipmentForm} />
        ) : showOceanLCLForm ? (
          <OceanLCLForm handleClose={handleCloseOceanLCLForm} />
        ) : showOceanFCLForm ? (
          <OceanFCLForm handleClose={handleCloseOceanFCLForm} />
        ) : (
          <>
            <Box>
              {viewShipmentError && <Alert severity="error" sx={{ mb: 2 }}>{viewShipmentError}</Alert>}
              <SharedHomepageHeader title="Shipment Form" buttonText='New Shipment' onButtonClick={onClickOfNewShipment} />
              <SharedSearchField page="shipment" />
              <ShipmentTabs onViewShipment={handleViewShipment} />
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
                <Button variant="contained" size="small" sx={btnStyle} onClick={handleOpenAirShipmentForm}>
                  Air Shipment Form
                </Button>

                <Button variant="contained" size="small" sx={btnStyle} onClick={handleOpenOceanLCLForm}>
                  LCL Shipment Form
                </Button>

                <Button variant="contained" size="small" sx={btnStyle} onClick={handleOpenOceanFCLForm}>
                  FCL Shipment Form
                </Button>
              </Stack>
            </DialogContent>
          </Dialog>
          </>
        )}
      </ErrorBoundary>
    </>
  );
}
