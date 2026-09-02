import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, IconButton, Paper, Snackbar, Stack, TextField, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from '../../redux/store';
import { PATH_DASHBOARD } from '../../routes/paths';
import { updateWarehouseReceiptLocation } from '../../redux/slices/warehouseReceipt';
import {
  addScannedFreightBarcode,
  clearReceiptLookup,
  getLocationScanReceipt,
} from '../../redux/slices/locationScan';

const getFreightInformation = (receipt) => {
  const freightInformation = receipt?.freightInformation || receipt?.rawData?.freightInformation;
  return Array.isArray(freightInformation) ? freightInformation : [];
};

const getRequiredFreightBarcodes = (receipt) => getFreightInformation(receipt)
  .map((freight) => String(freight.freightBarcodeValue || '').trim().toUpperCase())
  .filter(Boolean);

const parseScannedFreightBarcode = (value) => {
  const cleanValue = String(value || '').trim();
  const [receiptNumber, ...freightParts] = cleanValue.split('-');
  if (freightParts.length) {
    return { receiptNumber: receiptNumber.trim(), freightBarcodeValue: freightParts.join('-').trim().toUpperCase() };
  }
  return { receiptNumber: '', freightBarcodeValue: cleanValue.toUpperCase() };
};

export default function LocationScanPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    loading: receiptLoading = false,
    scannedFreightBarcodes = [],
  } = useSelector((state) => state.locationScandata || {});
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [barcodeValue, setBarcodeValue] = useState('');
  const [freightScanValue, setFreightScanValue] = useState('');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState(null);
  const [notFoundSnackbarOpen, setNotFoundSnackbarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const scanTimerRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const freightInputRef = useRef(null);
  const locationInputRef = useRef(null);
  const lookupInProgressRef = useRef(false);

  const loadReceipt = async (value) => {
    const receiptNumber = String(value || '').trim();
    if (!receiptNumber || lookupInProgressRef.current) return;

    lookupInProgressRef.current = true;
    window.clearTimeout(scanTimerRef.current);
    setMessage(null);
    const response = await dispatch(getLocationScanReceipt(receiptNumber.slice(0, 100)));
    lookupInProgressRef.current = false;
    const receipt = response?.data;

    if (response?.notFound) {
      setSelectedReceipt(null);
      setLocation('');
      setMessage(null);
      setNotFoundSnackbarOpen(true);
      return;
    }

    if (!receipt || response?.error) {
      setMessage({ severity: 'error', text: response?.message || `Warehouse receipt ${receiptNumber} was not found.` });
      return;
    }

    setBarcodeValue('');
    setSelectedReceipt(receipt);
    setLocation(receipt.location || '');
    const requiredFreightBarcodes = getRequiredFreightBarcodes(receipt);
    const scannedFreightBarcode = String(response.scannedFreightBarcodeValue || '').toUpperCase();
    if (scannedFreightBarcode && !requiredFreightBarcodes.includes(scannedFreightBarcode)) {
      setMessage({ severity: 'error', text: `${scannedFreightBarcode} is not available on this warehouse receipt.` });
    } else {
      setMessage({ severity: 'success', text: `Warehouse receipt ${receipt.receiptNumber || receiptNumber} loaded.` });
    }
  };

  useEffect(() => {
    if (selectedReceipt || receiptLoading) return undefined;
    const focusTimer = window.setTimeout(() => barcodeInputRef.current?.focus(), 100);
    return () => window.clearTimeout(focusTimer);
  }, [receiptLoading, selectedReceipt]);

  useEffect(() => () => window.clearTimeout(scanTimerRef.current), []);

  useEffect(() => {
    if (!selectedReceipt) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = 'Your scanned freight and location changes will be lost.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [selectedReceipt]);

  const requiredFreightBarcodes = getRequiredFreightBarcodes(selectedReceipt);
  const scannedFreightBarcodeSet = new Set(scannedFreightBarcodes.map((value) => String(value).toUpperCase()));
  const unscannedFreightBarcodes = requiredFreightBarcodes.filter(
    (freightBarcode) => !scannedFreightBarcodeSet.has(freightBarcode)
  );
  const allFreightScanned = unscannedFreightBarcodes.length === 0;

  useEffect(() => {
    if (!selectedReceipt || requiredFreightBarcodes.length === 0 || !allFreightScanned) return undefined;

    const focusTimer = window.setTimeout(() => {
      locationInputRef.current?.focus();
      locationInputRef.current?.select();
    }, 100);

    return () => window.clearTimeout(focusTimer);
  }, [allFreightScanned, requiredFreightBarcodes.length, selectedReceipt]);

  const handleFreightScan = useCallback((value) => {
    const { receiptNumber, freightBarcodeValue } = parseScannedFreightBarcode(value);
    if (!freightBarcodeValue || !selectedReceipt) return;

    const selectedReceiptNumber = String(selectedReceipt.receiptNumber || '').trim();
    if (receiptNumber && receiptNumber !== selectedReceiptNumber) {
      setMessage({ severity: 'error', text: `The scanned freight belongs to receipt ${receiptNumber}, not ${selectedReceiptNumber}.` });
      return;
    }

    const availableFreightBarcodes = getRequiredFreightBarcodes(selectedReceipt);
    if (!availableFreightBarcodes.includes(freightBarcodeValue)) {
      setMessage({ severity: 'error', text: `${freightBarcodeValue} is not available on this warehouse receipt.` });
      return;
    }

    dispatch(addScannedFreightBarcode(freightBarcodeValue));
    setFreightScanValue('');
    setMessage({ severity: 'success', text: `${freightBarcodeValue} scanned successfully.` });
    window.setTimeout(() => freightInputRef.current?.focus(), 100);
  }, [dispatch, selectedReceipt]);

  const handleUpdate = async () => {
    if (!allFreightScanned) {
      setMessage({
        severity: 'warning',
        text: `Scan all freight items before updating the location. Unscanned: ${unscannedFreightBarcodes.join(', ')}. Scan them or reach out to the office to split the receipt.`,
      });
      return;
    }

    const cleanLocation = location.trim();
    if (!cleanLocation) {
      setMessage({ severity: 'error', text: 'Location is required.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    const result = await dispatch(updateWarehouseReceiptLocation({
      receiptId: selectedReceipt.receiptId || selectedReceipt.id,
      location: cleanLocation,
    }));
    setSaving(false);

    if (result?.error) {
      setMessage({ severity: 'error', text: result.message || 'Failed to update location.' });
      return;
    }

    setSelectedReceipt(null);
    dispatch(clearReceiptLookup());
    setLocation('');
    setMessage({ severity: 'success', text: 'Location updated successfully. Scan the next receipt.' });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#e7e7e7', p: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1.5 }}>
        <IconButton
          size="small"
          aria-label="Back to Shipment Form"
          onClick={() => navigate(PATH_DASHBOARD.shipmentBuilding)}
          sx={{ color: '#111' }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
          Location - View/Update
        </Typography>
      </Stack>

      {message && <Alert severity={message.severity} sx={{ mb: 1.5 }}>{message.text}</Alert>}

      {!selectedReceipt ? (
        <Paper sx={{ p: 2, boxShadow: 'none', colorScheme: 'light' }}>
          <Stack spacing={2}>
            {receiptLoading && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={20} />
                <Typography sx={{ fontSize: 12, color: '#000' }}>Loading warehouse receipt...</Typography>
              </Stack>
            )}
            <TextField
              inputRef={barcodeInputRef}
              label="Warehouse Receipt Barcode"
              variant="standard"
              value={barcodeValue}
              autoFocus
              fullWidth
              autoComplete="off"
              disabled={receiptLoading}
              sx={{ '& .MuiInputBase-input': { color: '#000', WebkitTextFillColor: '#000' } }}
              onChange={(event) => {
                const value = event.target.value;
                setBarcodeValue(value);
                window.clearTimeout(scanTimerRef.current);
                scanTimerRef.current = window.setTimeout(() => loadReceipt(value), 500);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== 'Tab') return;
                event.preventDefault();
                window.clearTimeout(scanTimerRef.current);
                loadReceipt(event.currentTarget.value);
              }}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => navigate(PATH_DASHBOARD.shipmentBuilding)}
                disabled={receiptLoading}
                sx={{ textTransform: 'none' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={() => loadReceipt(barcodeValue)}
                onPointerDown={(event) => {
                  if (event.pointerType === 'mouse') return;
                  event.preventDefault();
                  loadReceipt(barcodeValue);
                }}
                disabled={receiptLoading || !barcodeValue.trim()}
                sx={{ bgcolor: '#A22', textTransform: 'none', '&:hover': { bgcolor: '#8b1c1c' } }}
              >
                {receiptLoading ? <CircularProgress size={18} color="inherit" /> : 'Submit'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : (
        <Paper sx={{ p: 2, boxShadow: 'none' }}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontSize: 11, color: '#666' }}>Warehouse Receipt #</Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{selectedReceipt.receiptNumber || '-'}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: '#666' }}>PRO Number</Typography>
              <Typography sx={{ fontSize: 14 }}>{selectedReceipt.proNumber || '-'}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: '#666' }}>Customer Info</Typography>
              <Typography sx={{ fontSize: 14 }}>
                {[selectedReceipt.customerName, selectedReceipt.stationName].filter(Boolean).join(' | ') || '-'}
              </Typography>
            </Box>
            {!allFreightScanned && (
              <Alert severity="warning">
                <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                  Scan all freight items before updating the location.
                </Typography>
                <Typography sx={{ fontSize: 12 }}>
                  Unscanned: {unscannedFreightBarcodes.join(', ')}
                </Typography>
                <Typography sx={{ fontSize: 12 }}>
                  Scan the remaining items or reach out to the office to split the receipt.
                </Typography>
              </Alert>
            )}
            {requiredFreightBarcodes.length > 0 && allFreightScanned && (
              <Alert severity="success">All freight items have been scanned.</Alert>
            )}
            {!allFreightScanned && (
              <TextField
                inputRef={freightInputRef}
                label="Freight Barcode"
                variant="standard"
                value={freightScanValue}
                autoFocus
                fullWidth
                autoComplete="off"
                onChange={(event) => {
                  const value = event.target.value;
                  setFreightScanValue(value);
                  window.clearTimeout(scanTimerRef.current);
                  scanTimerRef.current = window.setTimeout(() => handleFreightScan(value), 500);
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== 'Tab') return;
                  event.preventDefault();
                  window.clearTimeout(scanTimerRef.current);
                  handleFreightScan(event.currentTarget.value);
                }}
              />
            )}
            <TextField
              inputRef={locationInputRef}
              label="Location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              size="small"
              required
              fullWidth
              sx={allFreightScanned ? {
                '& .MuiOutlinedInput-root.Mui-focused': {
                  bgcolor: '#eaf3ff',
                  boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.18)',
                  '& fieldset': { borderColor: '#1976d2', borderWidth: 2 },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#1976d2' },
              } : undefined}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => {
                  setSelectedReceipt(null);
                  setFreightScanValue('');
                  setLocation('');
                  setMessage(null);
                  dispatch(clearReceiptLookup());
                }}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleUpdate}
                disabled={saving || !allFreightScanned}
                sx={{ bgcolor: '#A22', textTransform: 'none', '&:hover': { bgcolor: '#8b1c1c' } }}
              >
                {saving ? <CircularProgress size={18} color="inherit" /> : 'Update Location'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}
      <Snackbar
        open={notFoundSnackbarOpen}
        autoHideDuration={4000}
        onClose={(event, reason) => {
          if (reason !== 'clickaway') setNotFoundSnackbarOpen(false);
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="warning" variant="filled" onClose={() => setNotFoundSnackbarOpen(false)}>
          No data found.
        </Alert>
      </Snackbar>
    </Box>
  );
}
