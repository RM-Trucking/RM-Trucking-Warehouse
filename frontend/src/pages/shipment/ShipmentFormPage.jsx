import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Autocomplete, Box, Typography, Dialog, DialogTitle, Stack, Button, Divider, IconButton,
  DialogContent, useMediaQuery, Alert, CircularProgress, Snackbar, TextField, MenuItem
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
import { useDispatch, useSelector } from '../../redux/store';
import { getExportAirlineOptions, getShipmentById } from '../../redux/slices/shipment';
import {
  searchWarehouseReceiptCustomers,
  searchWarehouseReceiptStations,
} from '../../redux/slices/warehouseReceipt';
// ----------------------------------------------------------------------

const getCustomerOptionLabel = (option) => {
  if (!option) return '';
  if (typeof option === 'string') return option;
  const customerName = option.customerName || option.name || option.label || '';
  const stationName = option.stationName || '';
  return stationName ? `${customerName} | ${stationName}` : customerName;
};

const getStationOptionLabel = (option) => {
  if (!option) return '';
  if (typeof option === 'string') return option;
  return option.stationName || option.name || option.label || '';
};

const getConsigneeOptionLabel = (option) => {
  if (!option) return '';
  if (typeof option === 'string') return option;
  return [
    option.airlineNumber,
    option.airlineCode,
    option.airlineName,
    option.airportCode,
    option.city,
    option.state,
  ]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .join(' - ');
};

const emptyShipmentFilters = {
  scanned: '',
  pickup: '',
  shipped: '',
  request: '',
  customer: '',
  customerId: '',
  station: '',
  stationId: '',
  consignee: '',
  consigneeId: '',
  airBillNumber: '',
};

export default function ShipmentFormPage() {
  const location = useLocation();

  return <ShipmentFormPageContent key={location.state?.shipmentGridResetKey || 'shipment-form'} />;
}

function ShipmentFormPageContent() {
  const dispatch = useDispatch();
  const {
    customerOptions = [],
    customerLoading = false,
    stationOptions = [],
    stationLoading = false,
  } = useSelector((state) => state.warehouseReceiptdata || {});
  const {
    exportAirlineOptions = [],
    exportAirlineLoading = false,
  } = useSelector((state) => state.shipmentdata || {});
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isScanGunScreen = useMediaQuery('(max-width:599.95px)', { noSsr: true });
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [showAirShipmentForm, setShowAirShipmentForm] = useState(false);
  const [showOceanLCLForm, setShowOceanLCLForm] = useState(false);
  const [showOceanFCLForm, setShowOceanFCLForm] = useState(false);
  const [viewShipment, setViewShipment] = useState(null);
  const [viewShipmentError, setViewShipmentError] = useState('');
  const [comingSoonMessage, setComingSoonMessage] = useState('');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [shipmentFilters, setShipmentFilters] = useState(emptyShipmentFilters);
  const [appliedShipmentFilters, setAppliedShipmentFilters] = useState(emptyShipmentFilters);
  const [selectedShipmentType, setSelectedShipmentType] = useState('AIR');
  const activeFilterCount = Object.entries(appliedShipmentFilters)
    .filter(([key, value]) => !['customerId', 'stationId', 'consigneeId'].includes(key) && String(value).trim() !== '')
    .length;
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

  useEffect(() => {
    if (!filterDialogOpen || shipmentFilters.customerId) return undefined;
    const timer = window.setTimeout(() => {
      dispatch(searchWarehouseReceiptCustomers(shipmentFilters.customer));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [dispatch, filterDialogOpen, shipmentFilters.customer, shipmentFilters.customerId]);

  useEffect(() => {
    if (!filterDialogOpen || shipmentFilters.stationId) return undefined;
    const timer = window.setTimeout(() => {
      dispatch(searchWarehouseReceiptStations(shipmentFilters.customerId, shipmentFilters.station));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [dispatch, filterDialogOpen, shipmentFilters.customerId, shipmentFilters.station, shipmentFilters.stationId]);

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

  const handleCloseOceanFCLForm = () => {
    setShowOceanFCLForm(false);
  };

  const handleShipmentFilterChange = (field, value) => {
    setShipmentFilters((current) => ({ ...current, [field]: value }));
  };

  const handleCustomerInputChange = (value, reason) => {
    setShipmentFilters((current) => ({
      ...current,
      customer: value,
      customerId: reason === 'reset' ? current.customerId : '',
      station: reason === 'reset' ? current.station : '',
      stationId: reason === 'reset' ? current.stationId : '',
    }));
  };

  const handleCustomerChange = (value) => {
    setShipmentFilters((current) => ({
      ...current,
      customer: getCustomerOptionLabel(value),
      customerId: value?.customerId || value?.id || '',
      station: '',
      stationId: '',
    }));
  };

  const handleStationInputChange = (value, reason) => {
    setShipmentFilters((current) => ({
      ...current,
      station: value,
      stationId: reason === 'reset' ? current.stationId : '',
    }));
  };

  const handleStationChange = (value) => {
    setShipmentFilters((current) => ({
      ...current,
      station: getStationOptionLabel(value),
      stationId: value?.stationId || value?.id || '',
    }));
  };

  const handleConsigneeChange = (value) => {
    setShipmentFilters((current) => ({
      ...current,
      consignee: getConsigneeOptionLabel(value),
      consigneeId: value?.airlineId || value?.id || '',
    }));
  };

  const handleOpenShipmentFilters = () => {
    setShipmentFilters(appliedShipmentFilters);
    setFilterDialogOpen(true);
  };

  const handleApplyShipmentFilters = () => {
    setAppliedShipmentFilters(shipmentFilters);
    setFilterDialogOpen(false);
  };

  const handleClearShipmentFilters = () => {
    setShipmentFilters(emptyShipmentFilters);
    setAppliedShipmentFilters(emptyShipmentFilters);
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
              <SharedSearchField
                page="shipment"
                filters={appliedShipmentFilters}
                onFilterClick={handleOpenShipmentFilters}
                activeFilterCount={activeFilterCount}
                shipmentType={selectedShipmentType}
              />
              <ShipmentTabs
                onViewShipment={handleViewShipment}
                filters={appliedShipmentFilters}
                onShipmentTypeChange={setSelectedShipmentType}
              />
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

                <Button
                  variant="contained"
                  size="small"
                  aria-disabled="true"
                  sx={{ ...btnStyle, opacity: 0.5, cursor: 'not-allowed' }}
                  onClick={() => setComingSoonMessage('LCL Shipment Form will be available soon.')}
                >
                  LCL Shipment Form
                </Button>

                <Button
                  variant="contained"
                  size="small"
                  aria-disabled="true"
                  sx={{ ...btnStyle, opacity: 0.5, cursor: 'not-allowed' }}
                  onClick={() => setComingSoonMessage('FCL Shipment Form will be available soon.')}
                >
                  FCL Shipment Form
                </Button>
              </Stack>
            </DialogContent>
          </Dialog>
          <Snackbar
            open={Boolean(comingSoonMessage)}
            autoHideDuration={4000}
            onClose={(event, reason) => {
              if (reason !== 'clickaway') setComingSoonMessage('');
            }}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert severity="info" variant="filled" onClose={() => setComingSoonMessage('')}>
              {comingSoonMessage}
            </Alert>
          </Snackbar>
          </>
        )}
      </ErrorBoundary>
      <Dialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1, width: 'min(100%, 800px)' } }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ position: 'relative', pb: 1 }}>
            <Typography sx={{ textAlign: 'center', fontWeight: 700, fontSize: 16, mt: 2, mb: 2.2 }}>
              Search Filters
            </Typography>
            <IconButton
              size="small"
              onClick={() => setFilterDialogOpen(false)}
              sx={{ position: 'absolute', top: 0, right: 0, color: '#A22' }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            {[
              ['scanned', 'Scanned'],
              ['pickup', 'Pickup Entry'],
              ['shipped', 'Shipped'],
              ['request', 'Requested'],
            ].map(([field, label]) => (
              <TextField
                key={field}
                select
                size="small"
                label={label}
                value={shipmentFilters[field]}
                onChange={(event) => handleShipmentFilterChange(field, event.target.value)}
                fullWidth
              >
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </TextField>
            ))}
            <Autocomplete
              fullWidth
              options={exportAirlineOptions}
              value={
                shipmentFilters.consigneeId
                  ? { airlineId: shipmentFilters.consigneeId, airlineName: shipmentFilters.consignee }
                  : null
              }
              loading={exportAirlineLoading}
              onOpen={() => dispatch(getExportAirlineOptions())}
              getOptionLabel={getConsigneeOptionLabel}
              isOptionEqualToValue={(option, value) =>
                String(option?.airlineId || option?.id || '') === String(value?.airlineId || value?.id || '')
              }
              onChange={(event, newValue) => handleConsigneeChange(newValue)}
              loadingText="Loading consignees..."
              noOptionsText="No consignees found"
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Consignee"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {exportAirlineLoading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <TextField
              size="small"
              label="Air Bill Number"
              value={shipmentFilters.airBillNumber}
              onChange={(event) => handleShipmentFilterChange('airBillNumber', event.target.value)}
              fullWidth
            />
            <Autocomplete
              options={customerOptions}
              getOptionLabel={getCustomerOptionLabel}
              isOptionEqualToValue={(option, value) =>
                String(option?.customerId || option?.id || '') === String(value?.customerId || value?.id || '')
              }
              value={
                shipmentFilters.customerId
                  ? { id: shipmentFilters.customerId, name: shipmentFilters.customer }
                  : null
              }
              inputValue={shipmentFilters.customer}
              onInputChange={(event, newInputValue, reason) => handleCustomerInputChange(newInputValue, reason)}
              onChange={(event, newValue) => handleCustomerChange(newValue)}
              loading={customerLoading}
              loadingText="Searching customers..."
              noOptionsText={shipmentFilters.customer ? 'No customers found' : 'Type to search for customers'}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Search by Customer"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {customerLoading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              fullWidth
            />
            <Autocomplete
              options={stationOptions}
              getOptionLabel={getStationOptionLabel}
              isOptionEqualToValue={(option, value) =>
                String(option?.stationId || option?.id || '') === String(value?.stationId || value?.id || '')
              }
              value={
                shipmentFilters.stationId
                  ? { id: shipmentFilters.stationId, name: shipmentFilters.station }
                  : null
              }
              inputValue={shipmentFilters.station}
              onInputChange={(event, newInputValue, reason) => handleStationInputChange(newInputValue, reason)}
              onChange={(event, newValue) => handleStationChange(newValue)}
              loading={stationLoading}
              loadingText="Searching stations..."
              noOptionsText={
                shipmentFilters.customerId
                  ? shipmentFilters.station
                    ? 'No stations found'
                    : 'Type to search for stations'
                  : 'Select a customer first'
              }
              disabled={!shipmentFilters.customerId}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Search by Station"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {stationLoading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              fullWidth
            />
            <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleClearShipmentFilters}
                sx={{ color: '#333', borderColor: '#aaa', textTransform: 'none', minWidth: 70 }}
              >
                Clear
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleApplyShipmentFilters}
                sx={{ bgcolor: '#A22', '&:hover': { bgcolor: '#8b1c1c' }, textTransform: 'none', minWidth: 76 }}
              >
                Search
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
