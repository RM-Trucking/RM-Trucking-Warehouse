import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, IconButton, Paper, Stack, TextField, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from '../../redux/store';
import { PATH_DASHBOARD } from '../../routes/paths';
import {
  getWarehouseReceipts,
  updateWarehouseReceiptLocation,
} from '../../redux/slices/warehouseReceipt';
import { getLocationScanReceipt } from '../../redux/slices/locationScan';

const normalizeBarcode = (value) => String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

const getReceiptBarcodes = (receipt) => {
  const rawData = receipt.rawData || {};
  return [
    receipt.receiptNumber,
    receipt.proNumber,
    rawData.barcodeNumber,
    rawData.receiptNumber,
    rawData.proNumber,
  ].filter(Boolean);
};

export default function LocationScanPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { receipts = [], isLoading = false } = useSelector((state) => state.warehouseReceiptdata || {});
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const { loading: uploadLoading = false } = useSelector((state) => state.locationScandata || {});
  const scanBufferRef = useRef('');
  const scanTimerRef = useRef(null);
  const barcodeImageInputRef = useRef(null);

  useEffect(() => {
    dispatch(getWarehouseReceipts({ page: 1, pageSize: 500 }));
  }, [dispatch]);

  const processBarcode = useCallback((barcode) => {
    const normalizedBarcode = normalizeBarcode(barcode);
    if (!normalizedBarcode) return;

    const receipt = receipts.find((row) =>
      getReceiptBarcodes(row).some((value) => normalizeBarcode(value) === normalizedBarcode)
    );

    if (!receipt) {
      setSelectedReceipt(null);
      setLocation('');
      setMessage({ severity: 'error', text: `Warehouse receipt ${barcode} was not found.` });
      return;
    }

    setSelectedReceipt(receipt);
    setLocation(receipt.location || '');
    setMessage(null);
  }, [receipts]);

  const handleBarcodeImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setMessage(null);
    const imageUrl = URL.createObjectURL(file);

    try {
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(imageUrl);
      const receiptNumber = String(result?.getText?.() || '').trim();
      if (!receiptNumber) throw new Error('No barcode was detected in the selected image.');

      setMessage({ severity: 'info', text: `Barcode detected: ${receiptNumber}. Loading warehouse receipt...` });
      const response = await dispatch(getLocationScanReceipt(receiptNumber));
      const receipt = response?.data;

      if (!receipt || response?.error) {
        throw new Error(response?.message || `Warehouse receipt ${receiptNumber} was not found.`);
      }

      setSelectedReceipt(receipt);
      setLocation(receipt.location || '');
      setMessage({ severity: 'success', text: `Warehouse receipt ${receiptNumber} loaded.` });
    } catch (error) {
      const rawMessage = String(error?.message || 'Unable to read the barcode image.');
      const messageText = rawMessage.includes('MultiFormat') || rawMessage.includes('No readers')
        ? 'No readable barcode was found. Upload a clear image with the complete barcode visible.'
        : rawMessage;
      setSelectedReceipt(null);
      setLocation('');
      setMessage({ severity: 'error', text: messageText });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  useEffect(() => {
    const resetBufferTimer = () => {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = window.setTimeout(() => {
        scanBufferRef.current = '';
      }, 250);
    };

    const handleKeyDown = (event) => {
      if (selectedReceipt || saving || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.key === 'Enter') {
        const barcode = scanBufferRef.current.trim();
        scanBufferRef.current = '';
        window.clearTimeout(scanTimerRef.current);
        if (barcode) processBarcode(barcode.slice(0, 100));
        return;
      }
      if (event.key.length === 1) {
        scanBufferRef.current += event.key;
        resetBufferTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(scanTimerRef.current);
    };
  }, [processBarcode, saving, selectedReceipt]);

  const handleUpdate = async () => {
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
        <Paper sx={{ minHeight: 240, p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: 'none' }}>
          {isLoading ? (
            <Stack spacing={1.5} alignItems="center">
              <CircularProgress size={32} />
              <Typography sx={{ fontSize: 12 }}>Loading warehouse receipts...</Typography>
            </Stack>
          ) : (
            <Stack spacing={1} alignItems="center">
              <Typography sx={{ fontSize: 18, fontWeight: 700 }}>Scan gun ready</Typography>
              <Typography sx={{ maxWidth: 280, fontSize: 12, color: '#555' }}>
                Press the scan gun trigger and scan the warehouse receipt barcode.
              </Typography>
              <input
                ref={barcodeImageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleBarcodeImageUpload}
              />
              <Button
                variant="contained"
                size="small"
                disabled={uploadLoading}
                onClick={() => barcodeImageInputRef.current?.click()}
                sx={{ mt: 1, bgcolor: '#A22', textTransform: 'none', '&:hover': { bgcolor: '#8b1c1c' } }}
              >
                {uploadLoading ? <CircularProgress size={18} color="inherit" /> : 'Upload Barcode Image'}
              </Button>
            </Stack>
          )}
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
            <TextField
              label="Location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              size="small"
              required
              autoFocus
              fullWidth
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => {
                  setSelectedReceipt(null);
                  setLocation('');
                  setMessage(null);
                }}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleUpdate}
                disabled={saving}
                sx={{ bgcolor: '#A22', textTransform: 'none', '&:hover': { bgcolor: '#8b1c1c' } }}
              >
                {saving ? <CircularProgress size={18} color="inherit" /> : 'Update Location'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
