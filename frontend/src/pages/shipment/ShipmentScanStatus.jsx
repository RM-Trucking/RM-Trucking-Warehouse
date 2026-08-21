import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import {
    Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogTitle, IconButton, Paper, Snackbar, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalPrintshopIcon from '@mui/icons-material/LocalPrintshop';
import { useDispatch, useSelector } from '../../redux/store';
import {
    addShipmentReceipt, completeShipment, deleteShipmentReceipt, getShipmentReceiptOptions, scanShipmentFreight,
    signOffShipment, splitApprovalShipment, unscanShipmentFreight,
} from '../../redux/slices/shipment';

const getReceiptStatus = (receipt) => {
    const summary = receipt.freightSummary || {};
    const total = Number(summary.total || 0);
    const scanned = Number(summary.scanned || 0);

    if (total > 0 && scanned >= total) return 'Scanned';
    if (scanned > 0) return 'Unscanned';
    return 'Available';
};

const statusStyles = {
    Scanned: { bgcolor: '#58ad70', color: '#fff' },
    Unscanned: { bgcolor: '#efb52e', color: '#fff' },
    Available: { bgcolor: '#f1f1f1', color: '#333' },
};

const getFreightItems = (receipt) => {
    const source = receipt || {};
    const items = source.freightInformation || source.freightItems || source.freights || source.items;
    if (Array.isArray(items)) return items;

    const scannedItems = source.freightSummary?.scannedItems;
    const unscannedItems = source.freightSummary?.unscannedItems;
    return [
        ...(Array.isArray(scannedItems) ? scannedItems : []),
        ...(Array.isArray(unscannedItems) ? unscannedItems : []),
    ];
};

const getFreightItemStatus = (item = {}) => {
    const status = String(item.status || item.scanStatus || item.isScanned || '').trim().toLowerCase();
    return status === 'scanned' || status === 'y' || status === 'true' || status === '1'
        ? 'Scanned'
        : 'Unscanned';
};

const mergeScanResponse = (shipment, data) => {
    const updated = data?.shipment || data;
    if (Array.isArray(updated?.receipts)) return { ...shipment, ...updated };
    if (Array.isArray(data?.receipts)) return { ...shipment, receipts: data.receipts };

    if (updated?.receiptId || updated?.shipmentReceiptId) {
        return {
            ...shipment,
            receipts: (shipment?.receipts || []).map((receipt) => {
                const isMatch = updated.shipmentReceiptId
                    ? String(receipt.shipmentReceiptId) === String(updated.shipmentReceiptId)
                    : String(receipt.receiptId) === String(updated.receiptId);
                return isMatch ? { ...receipt, ...updated } : receipt;
            }),
        };
    }

    return shipment;
};

const decodeUploadedBarcode = async (image) => {
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);

    try {
        return await reader.decodeFromImageElement(image);
    } catch (originalError) {
        const longestSide = Math.max(image.naturalWidth, image.naturalHeight, 1);
        const scale = Math.min(4, Math.max(2, 1800 / longestSide));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw originalError;

        context.imageSmoothingEnabled = false;
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        try {
            return reader.decodeFromCanvas(canvas);
        } catch (scaledError) {
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const { data } = imageData;
            for (let index = 0; index < data.length; index += 4) {
                const luminance = (data[index] * 0.299) + (data[index + 1] * 0.587) + (data[index + 2] * 0.114);
                const value = luminance < 150 ? 0 : 255;
                data[index] = value;
                data[index + 1] = value;
                data[index + 2] = value;
            }
            context.putImageData(imageData, 0, 0);

            try {
                return reader.decodeFromCanvas(canvas);
            } catch {
                throw scaledError;
            }
        }
    }
};

export default function ShipmentScanStatus({ shipment, onClose, onCompleteSuccess, mobile = false }) {
    const dispatch = useDispatch();
    const {
        scanFreightLoading, completeShipmentLoading, signOffLoading, splitApprovalLoading,
        addShipmentReceiptLoading, shipmentReceiptOptionsByField, shipmentReceiptLoadingByField,
    } = useSelector((state) => state.shipmentdata);
    const [currentShipment, setCurrentShipment] = useState(shipment);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannerMode, setScannerMode] = useState('scan');
    const [unscanReceiptNumber, setUnscanReceiptNumber] = useState('');
    const [scannerStatus, setScannerStatus] = useState('');
    const [scanMessage, setScanMessage] = useState({ text: '', severity: 'success' });
    const [unscanReceipt, setUnscanReceipt] = useState(null);
    const [completeConfirmationOpen, setCompleteConfirmationOpen] = useState(false);
    const [splitApprovalOpen, setSplitApprovalOpen] = useState(false);
    const [signOffConfirmationOpen, setSignOffConfirmationOpen] = useState(false);
    const [splitApprovalCompleted, setSplitApprovalCompleted] = useState(
        shipment?.completeStatus === 'SPLIT_APPROVED'
    );
    const [splitReceiptIds, setSplitReceiptIds] = useState([]);
    const [receiptInputValues, setReceiptInputValues] = useState({});
    const [deletingReceiptId, setDeletingReceiptId] = useState(null);
    const receiptSearchTimersRef = useRef({});
    const videoRef = useRef(null);
    const barcodeImageInputRef = useRef(null);
    const scannerControlsRef = useRef(null);
    const scanInProgressRef = useRef(false);
    const mobileAutoScanHandledRef = useRef(false);
    const scanGunBufferRef = useRef('');
    const scanGunResetTimerRef = useRef(null);

    const receipts = Array.isArray(currentShipment?.receipts) ? currentShipment.receipts : [];
    const formName = currentShipment?.shipmentType === 'FCL'
        ? 'FCL Form'
        : currentShipment?.shipmentType === 'LCL' ? 'LCL Form' : 'Air Form';
    const destination = currentShipment?.destination || currentShipment?.destinationName || currentShipment?.stationName || '-';
    const proNumber = currentShipment?.proNumber || currentShipment?.barcodeNumber || currentShipment?.rmNumber || '-';
    const areAllReceiptsScanned = receipts.length > 0 && receipts.every(
        (receipt) => getReceiptStatus(receipt) === 'Scanned'
    );
    const hasScannedOrUnscannedItems = receipts.some((receipt) => {
        const status = getReceiptStatus(receipt);
        return status === 'Scanned' || status === 'Unscanned';
    });
    const isSignOffRequested = ['REQUESTED', 'SPLIT_APPROVED'].includes(currentShipment?.completeStatus);
    const isCompleteApproved = currentShipment?.completeStatus === 'APPROVED';
    const hasUnscannedReceipts = receipts.some((receipt) => getReceiptStatus(receipt) === 'Unscanned');
    const hasPendingScanReceipts = receipts.some((receipt) => {
        const status = getReceiptStatus(receipt);
        return status === 'Unscanned' || status === 'Available';
    });
    const hasScannedReceipts = receipts.some((receipt) => getReceiptStatus(receipt) === 'Scanned');
    const approvedSignOffVisible = isCompleteApproved && hasScannedReceipts && !hasUnscannedReceipts;
    const showApprovalAction = isSignOffRequested || approvedSignOffVisible;
    const canManageAvailableReceipts = showApprovalAction;
    const availableConfirmationRows = receipts
        .filter((receipt) => getReceiptStatus(receipt) === 'Available')
        .map((receipt) => {
            const summary = receipt.freightSummary || {};
            return {
                rowId: receipt.shipmentReceiptId || receipt.receiptId || receipt.receiptNumber,
                receiptNumber: receipt.receiptNumber,
                location: receipt.location || receipt.locationCode || currentShipment?.location || '-',
                pieces: `${Number(summary.scanned || 0)}/${Number(summary.total || receipt.piecesInland || 0)}`,
                weight: receipt.reWeight ?? receipt.weightInland ?? '-',
            };
        });
    const unscannedConfirmationRows = receipts
        .filter((receipt) => getReceiptStatus(receipt) === 'Unscanned')
        .map((receipt) => {
            const summary = receipt.freightSummary || {};
            return {
                rowId: receipt.shipmentReceiptId || receipt.receiptId || receipt.receiptNumber,
                receiptNumber: receipt.receiptNumber,
                location: receipt.location || receipt.locationCode || currentShipment?.location || '-',
                pieces: `${Number(summary.scanned || 0)}/${Number(summary.total || receipt.piecesInland || 0)}`,
                weight: receipt.reWeight ?? receipt.weightInland ?? '-',
            };
        });
    const splitApprovalRows = unscannedConfirmationRows;

    const stopScanner = useCallback(() => {
        scannerControlsRef.current?.stop?.();
        scannerControlsRef.current = null;
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
        }
        scanInProgressRef.current = false;
        scanGunBufferRef.current = '';
        clearTimeout(scanGunResetTimerRef.current);
    }, []);

    const closeScanner = useCallback(() => {
        stopScanner();
        setScannerOpen(false);
        setScannerStatus('');
    }, [stopScanner]);

    const submitBarcode = useCallback(async (barcodeValue) => {
        const shipmentId = currentShipment?.shipmentId || currentShipment?.id;
        if (!shipmentId || !barcodeValue || scanInProgressRef.current) return;

        if (scannerMode === 'unscan') {
            const normalizedBarcode = String(barcodeValue).replace(/[^a-z0-9]/gi, '').toLowerCase();
            const normalizedReceiptNumber = String(unscanReceiptNumber).replace(/[^a-z0-9]/gi, '').toLowerCase();
            if (!normalizedReceiptNumber || !normalizedBarcode.includes(normalizedReceiptNumber)) {
                const message = `The scanned barcode does not match warehouse receipt ${unscanReceiptNumber || '-'}.`;
                stopScanner();
                scanInProgressRef.current = false;
                setScannerStatus(message);
                setScanMessage({ text: message, severity: 'error' });
                return;
            }
        }

        scanInProgressRef.current = true;
        setScannerStatus(scannerMode === 'unscan' ? 'Updating freight unscan status...' : 'Updating freight scan status...');
        const action = scannerMode === 'unscan' ? unscanShipmentFreight : scanShipmentFreight;
        const result = await dispatch(action({ id: shipmentId, barcodeValue }));
        if (result?.success) {
            const nextShipment = mergeScanResponse(currentShipment, result.data);
            const nextReceipts = Array.isArray(nextShipment?.receipts) ? nextShipment.receipts : [];
            const allReceiptsScanned = nextReceipts.length > 0 && nextReceipts.every(
                (receipt) => getReceiptStatus(receipt) === 'Scanned'
            );
            setCurrentShipment(nextShipment);
            if (scannerMode === 'unscan' && mobile) {
                const updatedReceipt = nextReceipts.find(
                    (receipt) => String(receipt.receiptNumber) === String(unscanReceiptNumber)
                );
                if (updatedReceipt) setUnscanReceipt(updatedReceipt);
            }
            setScanMessage({
                text: scannerMode === 'unscan' ? 'Freight unscanned successfully.' : 'Freight scanned successfully.',
                severity: 'success',
            });
            if (scannerMode === 'unscan' || allReceiptsScanned) {
                closeScanner();
            } else {
                scanInProgressRef.current = false;
                setScannerStatus('Scan successful. Ready for the next freight barcode.');
            }
        } else {
            scanInProgressRef.current = false;
            const fallbackMessage = scannerMode === 'unscan' ? 'Unable to unscan freight.' : 'Unable to scan freight.';
            setScannerStatus(result?.error || `${fallbackMessage} Try again.`);
            setScanMessage({ text: result?.error || fallbackMessage, severity: 'error' });
        }
    }, [closeScanner, currentShipment, dispatch, mobile, scannerMode, stopScanner, unscanReceiptNumber]);

    useEffect(() => {
        if (!scannerOpen || mobile) return undefined;
        let disposed = false;
        let controls = null;

        const startScanner = async () => {
            if (!videoRef.current) return;
            if (!navigator.mediaDevices?.getUserMedia) {
                setScannerStatus('Camera is unavailable. Upload a barcode image instead.');
                return;
            }
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
    }, [mobile, scannerOpen, submitBarcode]);

    useEffect(() => {
        if (!scannerOpen || !mobile) return undefined;

        const handleScanGunInput = (event) => {
            if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;

            if (event.key === 'Enter' || event.key === 'Tab') {
                const barcodeValue = scanGunBufferRef.current.trim();
                scanGunBufferRef.current = '';
                clearTimeout(scanGunResetTimerRef.current);
                if (barcodeValue) {
                    event.preventDefault();
                    submitBarcode(barcodeValue.slice(0, 100));
                }
                return;
            }

            if (event.key.length !== 1) return;
            scanGunBufferRef.current += event.key;
            clearTimeout(scanGunResetTimerRef.current);
            scanGunResetTimerRef.current = setTimeout(() => {
                scanGunBufferRef.current = '';
            }, 500);
        };

        window.addEventListener('keydown', handleScanGunInput, true);
        return () => {
            window.removeEventListener('keydown', handleScanGunInput, true);
            clearTimeout(scanGunResetTimerRef.current);
            scanGunBufferRef.current = '';
        };
    }, [mobile, scannerOpen, submitBarcode]);

    useEffect(() => () => stopScanner(), [stopScanner]);

    useEffect(() => () => {
        Object.values(receiptSearchTimersRef.current).forEach(clearTimeout);
    }, []);

    const openScanner = useCallback((mode = 'scan', receiptNumber = '') => {
        setScanMessage((previous) => ({ ...previous, text: '' }));
        setScannerMode(mode);
        setUnscanReceiptNumber(receiptNumber);
        setScannerStatus(mobile
            ? `Scan the freight barcode with the scan gun to ${mode}.`
            : `Point the camera at the freight barcode to ${mode}.`);
        setScannerOpen(true);
    }, [mobile]);

    useEffect(() => {
        if (!mobile || mobileAutoScanHandledRef.current) return;
        mobileAutoScanHandledRef.current = true;
        if (hasPendingScanReceipts) openScanner('scan');
    }, [hasPendingScanReceipts, mobile, openScanner]);

    const handleBarcodeImageUpload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        stopScanner();
        setScannerStatus('Reading barcode from image...');
        const imageUrl = URL.createObjectURL(file);

        try {
            const image = new Image();
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = () => reject(new Error('Unable to load the selected image.'));
                image.src = imageUrl;
            });

            const result = await decodeUploadedBarcode(image);
            const barcodeValue = String(result?.getText?.() || '').trim();
            if (!barcodeValue) throw new Error('No barcode found in the selected image.');
            setScannerStatus(`Barcode detected: ${barcodeValue}. Updating freight scan status...`);
            await submitBarcode(barcodeValue.slice(0, 100));
        } catch (error) {
            const decodeError = String(error?.message || '');
            const message = decodeError.includes('MultiFormat')
                ? 'No readable barcode was found. Upload a clear, tightly cropped image with the full barcode visible.'
                : decodeError || 'Unable to read a barcode from this image.';
            setScannerStatus(message);
            setScanMessage({
                text: message,
                severity: 'error',
            });
        } finally {
            URL.revokeObjectURL(imageUrl);
        }
    };

    const openUnscanScanner = () => {
        const receiptNumber = unscanReceipt?.receiptNumber;
        setUnscanReceipt(null);
        openScanner('unscan', receiptNumber);
    };

    const handleComplete = async () => {
        const shipmentId = currentShipment?.shipmentId || currentShipment?.id;
        if (!shipmentId) {
            setScanMessage({ text: 'Shipment ID is unavailable.', severity: 'error' });
            return;
        }

        const result = await dispatch(completeShipment(shipmentId));
        if (result?.success) {
            onCompleteSuccess();
        } else {
            setCompleteConfirmationOpen(false);
            setScanMessage({ text: result?.error || 'Failed to complete shipment.', severity: 'error' });
        }
    };

    const handleCompleteClick = () => {
        setCompleteConfirmationOpen(true);
    };

    const handleSplitApproval = async () => {
        const shipmentId = currentShipment?.shipmentId || currentShipment?.id;
        if (!shipmentId) {
            setScanMessage({ text: 'Shipment ID is unavailable.', severity: 'error' });
            return;
        }

        const result = await dispatch(splitApprovalShipment(shipmentId));
        if (result?.success) {
            const updatedShipment = result.data?.shipment || result.data;
            const originalReceiptIds = new Set(
                receipts.map((receipt) => String(receipt.receiptId || receipt.shipmentReceiptId))
            );
            const updatedReceipts = Array.isArray(updatedShipment?.receipts)
                ? [...updatedShipment.receipts].sort((first, second) => {
                    const firstIsOriginal = originalReceiptIds.has(String(first.receiptId || first.shipmentReceiptId));
                    const secondIsOriginal = originalReceiptIds.has(String(second.receiptId || second.shipmentReceiptId));
                    return Number(secondIsOriginal) - Number(firstIsOriginal);
                })
                : receipts;
            const newSplitReceiptIds = updatedReceipts
                .filter((receipt) => !originalReceiptIds.has(String(receipt.receiptId || receipt.shipmentReceiptId)))
                .map((receipt) => String(receipt.shipmentReceiptId || receipt.receiptId));

            setCurrentShipment((previous) => ({
                ...previous,
                ...updatedShipment,
                receipts: updatedReceipts,
            }));
            setSplitReceiptIds(newSplitReceiptIds);
            setSplitApprovalCompleted(true);
            setSplitApprovalOpen(false);
            setScanMessage({
                text: result.message || 'Shipment split approved successfully',
                severity: 'success',
            });
        } else {
            setSplitApprovalOpen(false);
            setScanMessage({ text: result?.error || 'Failed to submit split approval.', severity: 'error' });
        }
    };

    const handleSignOff = async () => {
        const shipmentId = currentShipment?.shipmentId || currentShipment?.id;
        if (!shipmentId) {
            setScanMessage({ text: 'Shipment ID is unavailable.', severity: 'error' });
            return;
        }

        const result = await dispatch(signOffShipment(shipmentId));
        if (result?.success) {
            onCompleteSuccess('Shipment signed off successfully');
        } else {
            setSignOffConfirmationOpen(false);
            setScanMessage({ text: result?.error || 'Failed to sign off shipment.', severity: 'error' });
        }
    };

    const handleAddReceiptRow = () => {
        const temporaryId = `new-${Date.now()}`;
        setCurrentShipment((previous) => ({
            ...previous,
            receipts: [
                ...(previous?.receipts || []),
                {
                    shipmentReceiptId: temporaryId,
                    receiptNumber: '',
                    location: '',
                    freightSummary: { scanned: 0, total: 0 },
                    isNew: true,
                },
            ],
        }));
    };

    const handleReceiptSearch = (fieldKey, value, reason) => {
        if (reason === 'reset') return;
        if (receiptSearchTimersRef.current[fieldKey]) clearTimeout(receiptSearchTimersRef.current[fieldKey]);
        receiptSearchTimersRef.current[fieldKey] = setTimeout(() => {
            dispatch(getShipmentReceiptOptions(value, fieldKey));
        }, 500);
    };

    const handleAddReceiptSelection = async (temporaryId, receipt) => {
        if (!receipt?.receiptId || addShipmentReceiptLoading) return;
        const shipmentId = currentShipment?.shipmentId || currentShipment?.id;
        if (!shipmentId) {
            setScanMessage({ text: 'Shipment ID is unavailable.', severity: 'error' });
            return;
        }

        const result = await dispatch(addShipmentReceipt({ shipmentId, receiptId: receipt.receiptId }));
        if (!result?.success) {
            setScanMessage({ text: result?.error || 'Failed to add receipt to shipment.', severity: 'error' });
            return;
        }

        const responseData = result.data?.shipment || result.data;
        if (Array.isArray(responseData?.receipts)) {
            setCurrentShipment((previous) => ({ ...previous, ...responseData }));
        } else {
            const addedReceipt = result.data?.receipt || responseData;
            setCurrentShipment((previous) => ({
                ...previous,
                receipts: (previous?.receipts || []).map((item) =>
                    String(item.shipmentReceiptId) === String(temporaryId) ? addedReceipt : item
                ),
            }));
        }
        setReceiptInputValues((previous) => ({ ...previous, [temporaryId]: '' }));
        setScanMessage({ text: result.message || 'Receipt added successfully.', severity: 'success' });
    };

    const handleDeleteReceiptRow = async (rowIndex) => {
        const receipt = receipts[rowIndex];
        if (receipt?.isNew) {
            setCurrentShipment((previous) => ({
                ...previous,
                receipts: (previous?.receipts || []).filter((item, index) => index !== rowIndex),
            }));
            return;
        }

        const shipmentId = currentShipment?.shipmentId || currentShipment?.id;
        const receiptId = receipt?.receiptId;
        if (!shipmentId || !receiptId || deletingReceiptId !== null) {
            if (!shipmentId || !receiptId) {
                setScanMessage({ text: 'Shipment ID or receipt ID is unavailable.', severity: 'error' });
            }
            return;
        }

        setDeletingReceiptId(receiptId);
        const result = await dispatch(deleteShipmentReceipt({ shipmentId, receiptId }));
        setDeletingReceiptId(null);
        if (!result?.success) {
            setScanMessage({ text: result?.error || 'Failed to delete receipt from shipment.', severity: 'error' });
            return;
        }

        const responseData = result.data?.shipment || result.data;
        setCurrentShipment((previous) => ({
            ...previous,
            ...(Array.isArray(responseData?.receipts) ? responseData : {}),
            receipts: Array.isArray(responseData?.receipts)
                ? responseData.receipts
                : (previous?.receipts || []).filter((item) => String(item.receiptId) !== String(receiptId)),
        }));
        setScanMessage({ text: result.message || 'Receipt deleted successfully.', severity: 'success' });
    };

    return (
        <Box sx={{ minHeight: mobile ? '100vh' : 500, bgcolor: '#e7e7e7' }}>
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
                    <Stack direction="row" spacing={0.75} justifyContent="flex-end" sx={{ mt: 0.5 }}>
                        {showApprovalAction ? (
                            <Button
                                variant="contained"
                                size="small"
                                onClick={hasUnscannedReceipts
                                    ? () => setSplitApprovalOpen(true)
                                    : () => setSignOffConfirmationOpen(true)}
                                disabled={hasUnscannedReceipts ? splitApprovalLoading : signOffLoading}
                                sx={{ minWidth: 92, bgcolor: '#A22', fontSize: 10, py: 0.2, px: 1, textTransform: 'none', '&:hover': { bgcolor: '#8b1c1c' } }}
                            >
                                {signOffLoading
                                    ? <CircularProgress size={14} color="inherit" />
                                    : hasUnscannedReceipts ? 'Split Approval' : 'Sign off'}
                            </Button>
                        ) : (
                            <>
                                {!areAllReceiptsScanned && (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => openScanner('scan')}
                                        sx={{ minWidth: 58, bgcolor: '#A22', fontSize: 10, py: 0.2, px: 1, textTransform: 'none', '&:hover': { bgcolor: '#8b1c1c' } }}
                                    >
                                        Scan
                                    </Button>
                                )}
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={handleCompleteClick}
                                    disabled={completeShipmentLoading || !hasScannedOrUnscannedItems}
                                    sx={{ minWidth: 64, bgcolor: '#A22', fontSize: 10, py: 0.2, px: 1, textTransform: 'none', '&:hover': { bgcolor: '#8b1c1c' } }}
                                >
                                    {completeShipmentLoading ? <CircularProgress size={14} color="inherit" /> : 'Complete'}
                                </Button>
                            </>
                        )}
                    </Stack>
                </Box>
            </Box>

            <Paper sx={{ mx: mobile ? 0 : 1.5, mt: 1, p: mobile ? 0 : 3, minHeight: 390, borderRadius: mobile ? 0 : 2, boxShadow: 'none' }}>
                {splitApprovalCompleted && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            endIcon={<CheckCircleIcon sx={{ color: '#54ad72' }} />}
                            sx={{ minWidth: 112, py: 0.15, color: '#333', borderColor: '#aaa', bgcolor: '#f1f1f1', fontSize: 10, textTransform: 'none' }}
                        >
                            Split Approved
                        </Button>
                    </Box>
                )}
                <TableContainer sx={{ border: '1px solid #d7d7d7', borderRadius: 1.5 }}>
                    <Table size="small" sx={{ minWidth: mobile ? 650 : undefined }}>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#d7d7d7' }}>
                                {!mobile && <TableCell sx={{ fontWeight: 700, width: 50 }}>Sno</TableCell>}
                                <TableCell sx={{ fontWeight: 700 }}>{mobile ? 'Warehouse #' : 'Warehouse Receipt #'}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Pieces</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Weight (lbs)</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ position: mobile ? 'sticky' : 'static', right: mobile ? 0 : 'auto', zIndex: mobile ? 3 : 'auto', bgcolor: '#d7d7d7', boxShadow: mobile ? '-4px 0 6px -4px rgba(0,0,0,0.35)' : 'none', fontWeight: 700, textAlign: 'left' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {receipts.map((receipt, index) => {
                                const summary = receipt.freightSummary || {};
                                const status = getReceiptStatus(receipt);
                                const isSplitReceipt = splitReceiptIds.includes(
                                    String(receipt.shipmentReceiptId || receipt.receiptId)
                                );
                                return (
                                    <TableRow key={receipt.shipmentReceiptId || receipt.receiptId || index}>
                                        {!mobile && <TableCell>{String(index + 1).padStart(2, '0')}</TableCell>}
                                        <TableCell sx={receipt.isNew ? undefined : { color: '#b52025', fontWeight: 600, textDecoration: 'underline' }}>
                                            {receipt.isNew ? (
                                                <Autocomplete
                                                    size="small"
                                                    options={(shipmentReceiptOptionsByField[receipt.shipmentReceiptId] || []).filter(
                                                        (option) => !receipts.some((item) => !item.isNew && String(item.receiptId) === String(option.receiptId))
                                                    )}
                                                    inputValue={receiptInputValues[receipt.shipmentReceiptId] || ''}
                                                    loading={Boolean(shipmentReceiptLoadingByField[receipt.shipmentReceiptId]) || addShipmentReceiptLoading}
                                                    getOptionLabel={(option) => String(option?.receiptNumber || '')}
                                                    isOptionEqualToValue={(option, value) => String(option?.receiptId) === String(value?.receiptId)}
                                                    onInputChange={(event, value, reason) => {
                                                        setReceiptInputValues((previous) => ({ ...previous, [receipt.shipmentReceiptId]: value }));
                                                        handleReceiptSearch(receipt.shipmentReceiptId, value, reason);
                                                    }}
                                                    onChange={(event, value) => handleAddReceiptSelection(receipt.shipmentReceiptId, value)}
                                                    loadingText="Searching warehouse receipts..."
                                                    noOptionsText="Type a receipt number"
                                                    renderOption={(props, option) => (
                                                        <Box component="li" {...props} key={option.receiptId} sx={{ display: 'block !important' }}>
                                                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#243e9b' }}>
                                                                Receipts No - {option.receiptNumber}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: 12 }}>
                                                                Customer - {[option.customerName, option.stationName].filter(Boolean).join(' | ')}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    renderInput={(params) => (
                                                        <TextField {...params} placeholder="Type receipt number" variant="standard" />
                                                    )}
                                                />
                                            ) : receipt.receiptNumber || '-'}
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
                                        <TableCell
                                            align="left"
                                            sx={{ position: mobile ? 'sticky' : 'static', right: mobile ? 0 : 'auto', zIndex: mobile ? 2 : 'auto', bgcolor: '#fff', boxShadow: mobile ? '-4px 0 6px -4px rgba(0,0,0,0.25)' : 'none' }}
                                        >
                                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-start">
                                                {status !== 'Available' && !showApprovalAction && (
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => {
                                                            if (mobile) {
                                                                setUnscanReceipt(receipt);
                                                                if (hasScannedReceipts) {
                                                                    openScanner('unscan', receipt.receiptNumber);
                                                                }
                                                            } else {
                                                                setUnscanReceipt(receipt);
                                                            }
                                                        }}
                                                        sx={{ minWidth: 82, bgcolor: '#b5232b', borderRadius: 1, py: 0.35, px: 1.5, fontWeight: 700, textTransform: 'none', boxShadow: 'none', '&:hover': { bgcolor: '#971d24', boxShadow: 'none' } }}
                                                    >
                                                        Unscan
                                                    </Button>
                                                )}
                                                {status === 'Available' && canManageAvailableReceipts && (
                                                    <Box sx={{ width: 34, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                                                        <IconButton
                                                            size="small"
                                                            aria-label="Delete warehouse receipt"
                                                            title="Delete warehouse receipt"
                                                            onClick={() => handleDeleteReceiptRow(index)}
                                                            disabled={deletingReceiptId !== null}
                                                            sx={{ color: '#b5232b' }}
                                                        >
                                                            {String(deletingReceiptId) === String(receipt.receiptId)
                                                                ? <CircularProgress size={18} color="inherit" />
                                                                : <DeleteIcon fontSize="small" />}
                                                        </IconButton>
                                                    </Box>
                                                )}
                                                {isSplitReceipt && (
                                                    <Button
                                                        variant="text"
                                                        size="small"
                                                        startIcon={<LocalPrintshopIcon />}
                                                        sx={{ minWidth: 92, color: '#111', fontSize: 10, textTransform: 'none' }}
                                                    >
                                                        Print Label
                                                    </Button>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {!receipts.length && (
                                <TableRow>
                                    <TableCell colSpan={mobile ? 6 : 7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        No warehouse receipts available.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {canManageAvailableReceipts && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <IconButton
                            size="small"
                            aria-label="Add warehouse receipt"
                            title="Add warehouse receipt"
                            onClick={handleAddReceiptRow}
                            disabled={addShipmentReceiptLoading || receipts.some((receipt) => receipt.isNew)}
                            sx={{ bgcolor: '#A22', color: '#fff', '&:hover': { bgcolor: '#8b1c1c' } }}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Box>
                )}
            </Paper>
            <Dialog
                open={signOffConfirmationOpen}
                onClose={() => setSignOffConfirmationOpen(false)}
                maxWidth={availableConfirmationRows.length ? 'md' : 'sm'}
                fullWidth
                disableRestoreFocus
                PaperProps={{ sx: { borderRadius: 1.5 } }}
            >
                <DialogTitle sx={{ px: 2, py: 1.25, fontSize: 22, fontWeight: 500, borderBottom: '2px solid #aaa' }}>
                    Sign Off Confirmation
                    <IconButton
                        onClick={() => setSignOffConfirmationOpen(false)}
                        size="small"
                        sx={{ position: 'absolute', right: 8, top: 6 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: availableConfirmationRows.length ? { xs: 2, sm: 7 } : 3, pt: availableConfirmationRows.length ? 1.5 : 4, pb: 2 }}>
                    {availableConfirmationRows.length ? (
                        <>
                            <Typography sx={{ mb: 1.5, fontSize: 13, textAlign: 'center' }}>
                                All available warehouse receipts moved to On-Hand status
                            </Typography>
                            <TableContainer sx={{ border: '1px solid #ddd', borderRadius: 1.5 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#d1d1d1' }}>
                                            <TableCell sx={{ fontWeight: 700, width: 50 }}>Sno</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Warehouse Receipt #</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Pieces</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Weight (lbs)</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {availableConfirmationRows.map((row, index) => (
                                            <TableRow key={row.rowId || index}>
                                                <TableCell>{String(index + 1).padStart(2, '0')}</TableCell>
                                                <TableCell sx={{ color: '#b52025', fontWeight: 700, textDecoration: 'underline' }}>
                                                    {row.receiptNumber || '-'}
                                                </TableCell>
                                                <TableCell>{row.location}</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>{row.pieces}</TableCell>
                                                <TableCell>{row.weight}</TableCell>
                                                <TableCell>
                                                    <Box component="span" sx={{ display: 'inline-block', minWidth: 102, px: 1.5, py: 0.25, bgcolor: '#f1f1f1', color: '#333', borderRadius: 5, textAlign: 'center', fontSize: 11 }}>
                                                        Available
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    ) : (
                        <Stack spacing={3} alignItems="center">
                            <Typography sx={{ fontSize: 19, textAlign: 'center' }}>
                                Are you confident this is final <Box component="span" sx={{ fontWeight: 700 }}>sign-off</Box> ?
                            </Typography>
                            <Typography sx={{ fontSize: 19 }}>Do you want to proceed ?</Typography>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', gap: 2, pt: 3, pb: 4 }}>
                    <Button
                        variant="outlined"
                        onClick={() => setSignOffConfirmationOpen(false)}
                        disabled={signOffLoading}
                        sx={{ minWidth: 175, color: '#111', borderColor: '#333', fontSize: 17, textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSignOff}
                        disabled={signOffLoading}
                        sx={{ minWidth: 175, bgcolor: '#A22', fontSize: 17, textTransform: 'none', '&:hover': { bgcolor: '#8b1c1c' } }}
                    >
                        {signOffLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={splitApprovalOpen}
                onClose={() => setSplitApprovalOpen(false)}
                maxWidth="md"
                fullWidth
                disableRestoreFocus
                PaperProps={{ sx: { borderRadius: 1.5 } }}
            >
                <DialogTitle sx={{ px: 2, py: 1.25, fontSize: 15, fontWeight: 700, borderBottom: '2px solid #aaa' }}>
                    Split Approval Confirmation
                    <IconButton
                        onClick={() => setSplitApprovalOpen(false)}
                        size="small"
                        sx={{ position: 'absolute', right: 8, top: 6 }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: { xs: 2, sm: 7 }, pt: 2, pb: 1 }}>
                    <Typography sx={{ mb: 2, fontSize: 13, textAlign: 'center' }}>
                        These are partially scanned receipts
                    </Typography>
                    <TableContainer sx={{ border: '1px solid #ddd', borderRadius: 1.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#d1d1d1' }}>
                                    <TableCell sx={{ fontWeight: 700, width: 50 }}>Sno</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Warehouse Receipt #</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Pieces</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Weight (lbs)</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {splitApprovalRows.map((row, index) => (
                                    <TableRow key={row.rowId || index}>
                                        <TableCell>{String(index + 1).padStart(2, '0')}</TableCell>
                                        <TableCell sx={{ color: '#b52025', fontWeight: 700, textDecoration: 'underline' }}>
                                            {row.receiptNumber || '-'}
                                        </TableCell>
                                        <TableCell>{row.location}</TableCell>
                                        <TableCell>
                                            <Box component="span" sx={{ px: 0.75, py: 0.35, bgcolor: '#efb52e', borderRadius: 0.5, fontWeight: 700 }}>
                                                {row.pieces}
                                            </Box>
                                        </TableCell>
                                        <TableCell>{row.weight}</TableCell>
                                        <TableCell>
                                            <Box component="span" sx={{ display: 'inline-block', minWidth: 102, px: 1.5, py: 0.25, bgcolor: '#efb52e', color: '#fff', borderRadius: 5, textAlign: 'center', fontSize: 11 }}>
                                                Unscanned
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!splitApprovalRows.length && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                            No unscanned items available.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Stack spacing={1.5} alignItems="center" sx={{ mt: 2, mb: 1 }}>
                        <Typography sx={{ fontSize: 13, textAlign: 'center' }}>
                            A New warehouse receipt will be created for the unscanned items<br />
                            Scanned items will remain in the current warehouse receipt
                        </Typography>
                        <Typography sx={{ fontSize: 13 }}>Do you want to proceed ?</Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', gap: 1, pb: 2.5 }}>
                    <Button
                        variant="outlined"
                        onClick={() => setSplitApprovalOpen(false)}
                        disabled={splitApprovalLoading}
                        sx={{ minWidth: 116, color: '#111', borderColor: '#333', textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSplitApproval}
                        disabled={splitApprovalLoading || !splitApprovalRows.length}
                        sx={{ minWidth: 116, bgcolor: '#A22', textTransform: 'none', '&:hover': { bgcolor: '#8b1c1c' } }}
                    >
                        {splitApprovalLoading ? <CircularProgress size={18} color="inherit" /> : 'Yes'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={completeConfirmationOpen}
                onClose={() => setCompleteConfirmationOpen(false)}
                maxWidth={unscannedConfirmationRows.length ? 'md' : 'xs'}
                fullWidth
                disableRestoreFocus
                PaperProps={{ sx: { borderRadius: 1.5 } }}
            >
                <DialogTitle sx={{ px: 2, py: 1.25, fontSize: 15, fontWeight: 700, borderBottom: '2px solid #aaa' }}>
                    Complete Confirmation
                    <IconButton
                        onClick={() => setCompleteConfirmationOpen(false)}
                        size="small"
                        sx={{ position: 'absolute', right: 8, top: 6 }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: { xs: 2, sm: 7 }, pt: 2.5, pb: 1 }}>
                    {Boolean(unscannedConfirmationRows.length) && (
                        <TableContainer sx={{ border: '1px solid #ddd', borderRadius: 1.5 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#d1d1d1' }}>
                                        <TableCell sx={{ fontWeight: 700, width: 50 }}>Sno</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Warehouse Receipt #</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Pieces</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Weight (lbs)</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {unscannedConfirmationRows.map((row, index) => (
                                        <TableRow key={row.rowId || index}>
                                            <TableCell>{String(index + 1).padStart(2, '0')}</TableCell>
                                            <TableCell sx={{ color: '#b52025', fontWeight: 700, textDecoration: 'underline' }}>
                                                {row.receiptNumber || '-'}
                                            </TableCell>
                                            <TableCell>{row.location}</TableCell>
                                            <TableCell>
                                                <Box component="span" sx={{ px: 0.75, py: 0.35, bgcolor: '#efb52e', borderRadius: 0.5, fontWeight: 700 }}>
                                                    {row.pieces}
                                                </Box>
                                            </TableCell>
                                            <TableCell>{row.weight}</TableCell>
                                            <TableCell>
                                                <Box component="span" sx={{ display: 'inline-block', minWidth: 102, px: 1.5, py: 0.25, bgcolor: '#efb52e', color: '#fff', borderRadius: 5, textAlign: 'center', fontSize: 11 }}>
                                                    Unscanned
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    <Stack spacing={2.5} alignItems="center" sx={{ mt: unscannedConfirmationRows.length ? 8 : 2, mb: 1 }}>
                        <Typography sx={{ fontSize: 13, textAlign: 'center' }}>
                            Completing this action will send the request to Office for Customer approval.
                        </Typography>
                        <Typography sx={{ fontSize: 13 }}>Do you want to proceed ?</Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', gap: 1, pb: 2.5 }}>
                    <Button
                        variant="outlined"
                        onClick={() => setCompleteConfirmationOpen(false)}
                        disabled={completeShipmentLoading}
                        sx={{ minWidth: 116, color: '#111', borderColor: '#333', textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleComplete}
                        disabled={completeShipmentLoading}
                        sx={{ minWidth: 116, bgcolor: '#A22', textTransform: 'none', '&:hover': { bgcolor: '#8b1c1c' } }}
                    >
                        {completeShipmentLoading ? <CircularProgress size={18} color="inherit" /> : 'Yes'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={scannerOpen}
                onClose={closeScanner}
                maxWidth="md"
                fullWidth
                disableRestoreFocus
                sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
                    {scannerMode === 'unscan' ? 'Unscan Freight Barcode' : 'Scan Freight Barcode'}
                    <IconButton onClick={closeScanner} size="small" sx={{ position: 'absolute', right: 12, top: 12 }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={1.5}>
                        {scanMessage.text && (
                            <Alert
                                severity={scanMessage.severity}
                                variant="filled"
                                onClose={() => setScanMessage((previous) => ({ ...previous, text: '' }))}
                                sx={{ position: 'sticky', top: 0, zIndex: 2 }}
                            >
                                {scanMessage.text}
                            </Alert>
                        )}
                        {mobile ? (
                            <Box
                                sx={{
                                    minHeight: 180, border: '1px dashed #999', borderRadius: 1,
                                    bgcolor: '#f7f7f7', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', px: 3, textAlign: 'center',
                                }}
                            >
                                {scanFreightLoading ? (
                                    <CircularProgress size={32} />
                                ) : (
                                    <Stack spacing={1} alignItems="center">
                                        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Scan gun ready</Typography>
                                        <Typography sx={{ fontSize: 12, color: '#555' }}>
                                            Press the scan gun trigger and scan the freight barcode.
                                        </Typography>
                                    </Stack>
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ position: 'relative', bgcolor: '#000', borderRadius: 1, overflow: 'hidden', minHeight: { xs: 320, sm: 460 } }}>
                                <Box component="video" ref={videoRef} autoPlay playsInline muted sx={{ width: '100%', height: { xs: 320, sm: 460 }, display: 'block', objectFit: 'cover' }} />
                                <Box sx={{ position: 'absolute', left: '6%', right: '6%', top: '24%', height: '46%', border: '2px solid #fff', borderRadius: 1, boxShadow: '0 0 0 999px rgba(0,0,0,0.28)' }} />
                                {scanFreightLoading && (
                                    <CircularProgress sx={{ position: 'absolute', top: '50%', left: '50%', color: '#fff', transform: 'translate(-50%, -50%)' }} />
                                )}
                            </Box>
                        )}
                        <Typography sx={{ fontSize: 12, color: '#555' }}>{scannerStatus}</Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <input
                        ref={barcodeImageInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleBarcodeImageUpload}
                    />
                    <Button
                        onClick={() => barcodeImageInputRef.current?.click()}
                        variant="contained"
                        size="small"
                        disabled={scanFreightLoading}
                        sx={{ bgcolor: '#A22', textTransform: 'none', '&:hover': { bgcolor: '#8b1c1c' } }}
                    >
                        Upload Barcode Image
                    </Button>
                    <Button onClick={closeScanner} variant="outlined" size="small" sx={{ textTransform: 'none' }}>Cancel</Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={Boolean(unscanReceipt)}
                onClose={() => setUnscanReceipt(null)}
                maxWidth="md"
                fullWidth
                disableRestoreFocus
                PaperProps={{ sx: { minHeight: 325, borderRadius: 1.5 } }}
            >
                <DialogTitle sx={{ position: 'relative', px: 2, pt: 2, pb: 1, pr: 6, fontSize: 13, fontWeight: 700 }}>
                    Warehouse {unscanReceipt?.receiptNumber || '-'} - {' '}
                    {unscanReceipt?.proNumber || unscanReceipt?.barcodeNumber || currentShipment?.barcodeNumber || currentShipment?.rmNumber || '-'}
                    <IconButton
                        size="small"
                        aria-label="Close unscan popup"
                        onClick={() => setUnscanReceipt(null)}
                        sx={{ position: 'absolute', right: 10, top: 8 }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ px: 2, pt: 1, pb: 2 }}>
                    {scanMessage.text && (
                        <Alert
                            severity={scanMessage.severity}
                            variant="filled"
                            onClose={() => setScanMessage((previous) => ({ ...previous, text: '' }))}
                            sx={{ mb: 1 }}
                        >
                            {scanMessage.text}
                        </Alert>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.75 }}>
                        {(!mobile || hasScannedReceipts) && (
                            <Button
                                variant="contained"
                                size="small"
                                onClick={openUnscanScanner}
                                disabled={scanFreightLoading}
                                sx={{ minWidth: 58, bgcolor: '#b5232b', py: 0.15, px: 1.25, fontSize: 10, textTransform: 'none', boxShadow: 'none', '&:hover': { bgcolor: '#971d24', boxShadow: 'none' } }}
                            >
                                Unscan
                            </Button>
                        )}
                    </Box>
                    <TableContainer sx={{ border: '1px solid #d7d7d7', borderRadius: 0.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f1f1f1' }}>
                                    <TableCell sx={{ width: 48, fontSize: 11 }}>Sno</TableCell>
                                    <TableCell sx={{ fontSize: 11 }}>Piece</TableCell>
                                    <TableCell sx={{ fontSize: 11 }}>Weight (lbs)</TableCell>
                                    <TableCell sx={{ fontSize: 11 }}>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {getFreightItems(unscanReceipt).map((item, index) => {
                                    const freightStatus = getFreightItemStatus(item);
                                    return (
                                        <TableRow key={item.freightId || item.id || item.freightBarcodeValue || index}>
                                            <TableCell sx={{ fontSize: 11 }}>
                                                {item.freightBarcodeValue || String(index + 1).padStart(2, '0')}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: 11 }}>
                                                {item.pieces || item.piece || item.pieceNumber || '-'}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: 11 }}>{item.weight ?? item.reWeight ?? '-'}</TableCell>
                                            <TableCell>
                                                <Box
                                                    component="span"
                                                    sx={{ display: 'inline-block', minWidth: 66, px: 1.25, py: 0.2, borderRadius: 5, textAlign: 'center', fontSize: 10, ...statusStyles[freightStatus] }}
                                                >
                                                    {freightStatus}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!getFreightItems(unscanReceipt).length && (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: 12 }}>
                                            No freight pieces available.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
            </Dialog>
            <Snackbar
                open={Boolean(scanMessage.text) && !scannerOpen && !unscanReceipt}
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
    onCompleteSuccess: PropTypes.func.isRequired,
    mobile: PropTypes.bool,
};
