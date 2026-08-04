import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
    Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogTitle, IconButton, Paper, Snackbar, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useDispatch, useSelector } from '../../redux/store';
import { scanShipmentFreight } from '../../redux/slices/shipment';

const getReceiptStatus = (receipt) => {
    const summary = receipt.freightSummary || {};
    const total = Number(summary.total || 0);
    const scanned = Number(summary.scanned || 0);

    if (total > 0 && scanned >= total) return 'Scanned';
    if (Number(summary.unscanned || 0) > 0) return 'Unscanned';
    return 'Available';
};

const statusStyles = {
    Scanned: { bgcolor: '#58ad70', color: '#fff' },
    Unscanned: { bgcolor: '#efb52e', color: '#fff' },
    Available: { bgcolor: '#f1f1f1', color: '#333' },
};

export default function ShipmentScanStatus({ shipment, onClose }) {
    const dispatch = useDispatch();
    const { scanFreightLoading } = useSelector((state) => state.shipmentdata);
    const [currentShipment, setCurrentShipment] = useState(shipment);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannerStatus, setScannerStatus] = useState('');
    const [scanMessage, setScanMessage] = useState({ text: '', severity: 'success' });
    const videoRef = useRef(null);
    const scannerControlsRef = useRef(null);
    const scanInProgressRef = useRef(false);

    const receipts = Array.isArray(currentShipment?.receipts) ? currentShipment.receipts : [];
    const formName = currentShipment?.shipmentType === 'FCL'
        ? 'FCL Form'
        : currentShipment?.shipmentType === 'LCL' ? 'LCL Form' : 'Air Form';
    const destination = currentShipment?.destination || currentShipment?.destinationName || currentShipment?.stationName || '-';
    const proNumber = currentShipment?.proNumber || currentShipment?.barcodeNumber || currentShipment?.rmNumber || '-';
    const areAllReceiptsScanned = receipts.length > 0 && receipts.every(
        (receipt) => getReceiptStatus(receipt) === 'Scanned'
    );

    const stopScanner = useCallback(() => {
        scannerControlsRef.current?.stop?.();
        scannerControlsRef.current = null;
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
        }
        scanInProgressRef.current = false;
    }, []);

    const closeScanner = useCallback(() => {
        stopScanner();
        setScannerOpen(false);
        setScannerStatus('');
    }, [stopScanner]);

    const applyScanResponse = useCallback((data) => {
        const updated = data?.shipment || data;
        if (Array.isArray(updated?.receipts)) {
            setCurrentShipment((previous) => ({ ...previous, ...updated }));
        } else if (Array.isArray(data?.receipts)) {
            setCurrentShipment((previous) => ({ ...previous, receipts: data.receipts }));
        } else if (updated?.receiptId || updated?.shipmentReceiptId) {
            setCurrentShipment((previous) => ({
                ...previous,
                receipts: (previous?.receipts || []).map((receipt) => {
                    const isMatch = updated.shipmentReceiptId
                        ? String(receipt.shipmentReceiptId) === String(updated.shipmentReceiptId)
                        : String(receipt.receiptId) === String(updated.receiptId);
                    return isMatch ? { ...receipt, ...updated } : receipt;
                }),
            }));
        }
    }, []);

    const submitBarcode = useCallback(async (barcodeValue) => {
        const shipmentId = currentShipment?.shipmentId || currentShipment?.id;
        if (!shipmentId || !barcodeValue || scanInProgressRef.current) return;

        scanInProgressRef.current = true;
        setScannerStatus('Updating freight scan status...');
        const result = await dispatch(scanShipmentFreight({ id: shipmentId, barcodeValue }));
        if (result?.success) {
            applyScanResponse(result.data);
            setScanMessage({ text: 'Freight scanned successfully.', severity: 'success' });
            closeScanner();
        } else {
            scanInProgressRef.current = false;
            setScannerStatus(result?.error || 'Unable to scan freight. Try again.');
            setScanMessage({ text: result?.error || 'Unable to scan freight.', severity: 'error' });
        }
    }, [applyScanResponse, closeScanner, currentShipment?.id, currentShipment?.shipmentId, dispatch]);

    useEffect(() => {
        if (!scannerOpen) return undefined;
        let disposed = false;
        let controls = null;

        const startScanner = async () => {
            if (!videoRef.current) return;
            try {
                const reader = new BrowserMultiFormatReader();
                controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
                    const value = String(result?.getText?.() || '').trim();
                    if (value) submitBarcode(value.slice(0, 100));
                });
                if (disposed) controls.stop();
                else scannerControlsRef.current = controls;
            } catch (error) {
                setScannerStatus(error?.message || 'Unable to open barcode scanner.');
            }
        };

        const timer = setTimeout(startScanner, 100);
        return () => {
            disposed = true;
            clearTimeout(timer);
            controls?.stop?.();
        };
    }, [scannerOpen, submitBarcode]);

    useEffect(() => () => stopScanner(), [stopScanner]);

    const openScanner = () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setScanMessage({ text: 'Camera is not available in this browser.', severity: 'warning' });
            return;
        }
        setScannerStatus('Point the camera at the freight barcode.');
        setScannerOpen(true);
    };

    return (
        <Box sx={{ minHeight: 500, bgcolor: '#e7e7e7' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1.5, py: 1.25 }}>
                <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                        Shipment Form - {currentShipment?.barcodeNumber || currentShipment?.rmNumber || currentShipment?.shipmentId}
                    </Typography>
                    <Button
                        onClick={onClose}
                        color="inherit"
                        size="small"
                        sx={{ minWidth: 0, p: 0, mt: 0.5, fontSize: 11, textTransform: 'none' }}
                    >
                        &lt;&nbsp; {formName} / Scan Status
                    </Button>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700 }}>Dest: {destination}</Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 700 }}>PRO# - {proNumber}</Typography>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={areAllReceiptsScanned ? undefined : openScanner}
                        sx={{ mt: 0.5, minWidth: 58, bgcolor: '#A22', fontSize: 10, py: 0.2, px: 1, textTransform: 'none', '&:hover': { bgcolor: '#8b1c1c' } }}
                    >
                        {areAllReceiptsScanned ? 'Sign-Off' : 'Scan'}
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ mx: 1.5, mt: 1, p: 3, minHeight: 390, borderRadius: 2, boxShadow: 'none' }}>
                <TableContainer sx={{ border: '1px solid #d7d7d7', borderRadius: 1.5 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#d7d7d7' }}>
                                <TableCell sx={{ fontWeight: 700, width: 50 }}>Sno</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Warehouse Receipt #</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Pieces</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Weight (lbs)</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {receipts.map((receipt, index) => {
                                const summary = receipt.freightSummary || {};
                                const status = getReceiptStatus(receipt);
                                return (
                                    <TableRow key={receipt.shipmentReceiptId || receipt.receiptId || index}>
                                        <TableCell>{String(index + 1).padStart(2, '0')}</TableCell>
                                        <TableCell sx={{ color: '#b52025', fontWeight: 600, textDecoration: 'underline' }}>
                                            {receipt.receiptNumber || '-'}
                                        </TableCell>
                                        <TableCell>{receipt.location || receipt.locationCode || currentShipment?.location || '-'}</TableCell>
                                        <TableCell>
                                            <Box
                                                component="span"
                                                sx={{ px: 0.5, py: 0.25, borderRadius: 0.5, fontWeight: 700, ...statusStyles[status] }}
                                            >
                                                {Number(summary.scanned || 0)}/{Number(summary.total || receipt.piecesInland || 0)}
                                            </Box>
                                        </TableCell>
                                        <TableCell>{receipt.reWeight ?? receipt.weightInland ?? '-'}</TableCell>
                                        <TableCell>
                                            <Box
                                                component="span"
                                                sx={{ display: 'inline-block', minWidth: 82, px: 1.5, py: 0.25, borderRadius: 5, textAlign: 'center', fontSize: 11, ...statusStyles[status] }}
                                            >
                                                {status}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {!receipts.length && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        No warehouse receipts available.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
            <Dialog open={scannerOpen} onClose={closeScanner} maxWidth="md" fullWidth disableRestoreFocus>
                <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
                    Scan Freight Barcode
                    <IconButton onClick={closeScanner} size="small" sx={{ position: 'absolute', right: 12, top: 12 }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={1.5}>
                        <Box sx={{ position: 'relative', bgcolor: '#000', borderRadius: 1, overflow: 'hidden', minHeight: { xs: 320, sm: 460 } }}>
                            <Box component="video" ref={videoRef} autoPlay playsInline muted sx={{ width: '100%', height: { xs: 320, sm: 460 }, display: 'block', objectFit: 'cover' }} />
                            <Box sx={{ position: 'absolute', left: '6%', right: '6%', top: '24%', height: '46%', border: '2px solid #fff', borderRadius: 1, boxShadow: '0 0 0 999px rgba(0,0,0,0.28)' }} />
                            {scanFreightLoading && (
                                <CircularProgress sx={{ position: 'absolute', top: '50%', left: '50%', color: '#fff', transform: 'translate(-50%, -50%)' }} />
                            )}
                        </Box>
                        <Typography sx={{ fontSize: 12, color: '#555' }}>{scannerStatus}</Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeScanner} variant="outlined" size="small" sx={{ textTransform: 'none' }}>Cancel</Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={Boolean(scanMessage.text)}
                autoHideDuration={4000}
                onClose={(event, reason) => {
                    if (reason !== 'clickaway') setScanMessage((previous) => ({ ...previous, text: '' }));
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity={scanMessage.severity} variant="filled" onClose={() => setScanMessage((previous) => ({ ...previous, text: '' }))}>
                    {scanMessage.text}
                </Alert>
            </Snackbar>
        </Box>
    );
}

ShipmentScanStatus.propTypes = {
    shipment: PropTypes.object,
    onClose: PropTypes.func.isRequired,
};
