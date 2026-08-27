import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import {
    Alert, Autocomplete, Button, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogTitle, Snackbar, Typography, Stack, Grid, IconButton, Box, Table, TableBody,
    TableCell, TableHead, TableRow, TextField
} from '@mui/material';

import StyledTextField from '../../sections/shared/StyledTextField';
import Iconify from '../../components/iconify';
import ShipmentFormLayout, { TopInfoPanel } from '../../sections/shared/ShipmentFormLayout';
import { useDispatch, useSelector } from '../../redux/store';
import {
    getWarehouseReceiptNotes,
    postWarehouseReceiptNote,
    searchWarehouseReceiptCustomers,
    searchWarehouseReceiptStations,
} from '../../redux/slices/warehouseReceipt';
import {
    getExportAirlineOptions,
    getShipmentReceiptOptions,
    postShipment,
    updateShipment,
} from '../../redux/slices/shipment';

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

const getShipmentReceiptOptionLabel = (option) => {
    if (!option) return '';
    if (typeof option === 'string') return option;
    return String(option.receiptNumber || '');
};

const getReceiptStatus = (receipt = {}) => {
    const summary = receipt?.freightSummary || {};
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

const formatNoteTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: '2-digit',
        hour: 'numeric', minute: '2-digit', hour12: true,
    });
};


NewAirShipmentForm.propTypes = {
    handleClose: PropTypes.func.isRequired,
    rowData: PropTypes.object,
    viewMode: PropTypes.bool,
};

export default function NewAirShipmentForm({ handleClose, rowData = null, viewMode = false }) {
    const dispatch = useDispatch();
    const {
        customerOptions,
        customerLoading,
        stationOptions,
        stationLoading,
        receiptNotes,
        receiptNotesLoading,
        receiptNotesSaving,
        receiptNotesError,
    } = useSelector((state) => state.warehouseReceiptdata);
    const {
        exportAirlineOptions,
        exportAirlineLoading,
        shipmentReceiptOptionsByField,
        shipmentReceiptLoadingByField,
        createShipmentLoading,
    } = useSelector((state) => state.shipmentdata);

    // Define default values based on the Air Shipment image mockup
    const defaultValues = {
        rmProNo: rowData?.barcodeNumber || '',
        customer: rowData ? { customerId: rowData.customerId, customerName: rowData.customerName || rowData.customer || String(rowData.customerId || '') } : null,
        station: rowData ? { stationId: rowData.stationId, stationName: rowData.stationName || rowData.station || String(rowData.stationId || '') } : null,
        airBill: rowData?.airBillNumber || '',
        consignee: rowData ? {
            airlineId: rowData.consigneeId || rowData.airlineId,
            airlineName: rowData.airlineName || String(rowData.consigneeId || ''),
            airlineCode: rowData.airlineCode || '',
            airlineNumber: rowData.airlineNumber || '',
            airportCode: rowData.airportCode || '',
        } : null,
        booking: rowData?.booking || '',
        customerRefNumber: rowData?.customerRefNumber || '',
        additionalRefNo: rowData?.additionalRefNumber || '',
        instructions: rowData?.instructions || '',
        containers: rowData?.containers?.length
            ? rowData.containers.map((item) => ({ containerNo: item.container || item.containerNo || '' }))
            : [{ containerNo: '' }],
        warehouses: rowData?.receipts?.length
            ? rowData.receipts.map((item) => ({
                warehouseNo: { ...item, receiptNumber: item.receiptNumber || item.receiptId || '' },
                pieces: item.pieces ?? item.piecesInland ?? '',
                weight: item.weight ?? item.reWeight ?? '',
            }))
            : [{ warehouseNo: null, pieces: rowData?.pieces || '', weight: rowData?.weight || '' }],
    };

    const { control, handleSubmit, setValue, clearErrors, reset } = useForm({ defaultValues });

    const [barcodeValue, setBarcodeValue] = useState(viewMode ? rowData?.barcodeNumber || '' : '');
    const [customerSearchValue, setCustomerSearchValue] = useState(rowData?.customerName || rowData?.customer || String(rowData?.customerId || ''));
    const [stationSearchValue, setStationSearchValue] = useState(rowData?.stationName || rowData?.station || String(rowData?.stationId || ''));
    const [warehouseAlertOpen, setWarehouseAlertOpen] = useState(false);
    const [duplicateReceiptAlertOpen, setDuplicateReceiptAlertOpen] = useState(false);
    const [pendingReceiptSelection, setPendingReceiptSelection] = useState(null);
    const [submitError, setSubmitError] = useState('');
    const [warehouseReceiptError, setWarehouseReceiptError] = useState(false);
    const [receiptInputValues, setReceiptInputValues] = useState({});
    const [savedContainerRows, setSavedContainerRows] = useState(() => new Set());
    const [savedWarehouseRows, setSavedWarehouseRows] = useState(() => new Set());
    const [rowSaveError, setRowSaveError] = useState('');
    const [isEditing, setIsEditing] = useState(!viewMode);
    const [cancelEditDialogOpen, setCancelEditDialogOpen] = useState(false);
    const [closeFormAfterDiscard, setCloseFormAfterDiscard] = useState(false);
    const [notesDialogOpen, setNotesDialogOpen] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [notesMessage, setNotesMessage] = useState('');
    const receiptSearchTimers = useRef({});

    const rmProValue = useWatch({ control, name: 'rmProNo' });
    const selectedCustomer = useWatch({ control, name: 'customer' });
    const selectedStation = useWatch({ control, name: 'station' });
    const selectedCustomerId = selectedCustomer?.customerId || selectedCustomer?.id || '';
    const selectedStationId = selectedStation?.stationId || selectedStation?.id || '';
    const canSelectWarehouse = Boolean(selectedCustomerId && selectedStationId);

    const handleOpenNotes = () => {
        setNotesDialogOpen(true);
        dispatch(getWarehouseReceiptNotes(rowData?.noteThreadId || 0));
    };

    const handleAddNote = async () => {
        const messageText = noteText.trim();
        if (!messageText) {
            setNotesMessage('Notes is mandatory');
            return;
        }

        const response = await dispatch(postWarehouseReceiptNote({
            noteThreadId: rowData?.noteThreadId || 0,
            messageText,
        }));
        if (response?.error) {
            setNotesMessage(response.message || 'Failed to add shipment note');
            return;
        }
        setNoteText('');
    };

    const handleWarehouseAlertClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setWarehouseAlertOpen(false);
    };

    useEffect(() => () => {
        Object.values(receiptSearchTimers.current).forEach(clearTimeout);
    }, []);

    const handleReceiptSearch = (fieldKey, value, reason) => {
        if (reason === 'reset') return;
        if (!selectedCustomerId || !selectedStationId) {
            if (value) setWarehouseAlertOpen(true);
            return;
        }
        if (receiptSearchTimers.current[fieldKey]) clearTimeout(receiptSearchTimers.current[fieldKey]);
        receiptSearchTimers.current[fieldKey] = setTimeout(() => {
            dispatch(getShipmentReceiptOptions(value, fieldKey));
        }, 500);
    };

    const applyReceiptSelection = (index, receipt) => {
        setValue(`warehouses.${index}.warehouseNo`, receipt, { shouldDirty: true });
        setValue(`warehouses.${index}.pieces`, receipt?.piecesInland ?? '', { shouldDirty: true });
        setValue(`warehouses.${index}.weight`, receipt?.reWeight ?? '', { shouldDirty: true });
        if (receipt) setWarehouseReceiptError(false);
    };

    const handleReceiptSelection = (index, fieldKey, receipt) => {
        if (!receipt) {
            applyReceiptSelection(index, null);
            setReceiptInputValues((prev) => ({ ...prev, [fieldKey]: '' }));
            return;
        }

        const receiptId = receipt.receiptId;
        const receiptAlreadySelected = watchedWarehouses.some((warehouse, warehouseIndex) =>
            warehouseIndex !== index &&
            receiptId &&
            String(warehouse.warehouseNo?.receiptId || '') === String(receiptId)
        );

        if (receiptAlreadySelected) {
            setDuplicateReceiptAlertOpen(true);
            setReceiptInputValues((prev) => ({ ...prev, [fieldKey]: '' }));
            applyReceiptSelection(index, null);
            return;
        }

        const receiptStationId = receipt.stationId || '';
        const stationMismatch =
            receiptStationId &&
            selectedStationId &&
            String(receiptStationId) !== String(selectedStationId);

        if (stationMismatch) {
            setPendingReceiptSelection({ index, receipt });
            return;
        }

        applyReceiptSelection(index, receipt);
        setReceiptInputValues((prev) => ({
            ...prev,
            [fieldKey]: getShipmentReceiptOptionLabel(receipt),
        }));
    };

    const handleConfirmReceiptSelection = () => {
        if (pendingReceiptSelection) {
            applyReceiptSelection(
                pendingReceiptSelection.index,
                pendingReceiptSelection.receipt
            );
        }
        setPendingReceiptSelection(null);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(searchWarehouseReceiptCustomers(customerSearchValue));
        }, 500);

        return () => clearTimeout(timer);
    }, [dispatch, customerSearchValue]);

    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(searchWarehouseReceiptStations(selectedCustomerId, stationSearchValue));
        }, 500);

        return () => clearTimeout(timer);
    }, [dispatch, selectedCustomerId, stationSearchValue]);

    // Field arrays for dynamic Container and Warehouse lists
    const { fields: containerFields, append: appendContainer, remove: removeContainer } = useFieldArray({
        control,
        name: "containers"
    });

    const { fields: warehouseFields, append: appendWarehouse, remove: removeWarehouse } = useFieldArray({
        control,
        name: "warehouses"
    });

    const watchedWarehouses = useWatch({ control, name: 'warehouses' });
    const watchedContainers = useWatch({ control, name: 'containers' });
    const totalPieces = watchedWarehouses.reduce((sum, item) => sum + (Number(item.pieces) || 0), 0);
    const totalWeight = watchedWarehouses.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);

    const markContainerUnsaved = (rowId) => {
        setSavedContainerRows((previous) => {
            const next = new Set(previous);
            next.delete(rowId);
            return next;
        });
    };

    const markWarehouseUnsaved = (rowId) => {
        setSavedWarehouseRows((previous) => {
            const next = new Set(previous);
            next.delete(rowId);
            return next;
        });
    };

    const saveContainerRow = (rowId, index) => {
        if (!String(watchedContainers[index]?.containerNo || '').trim()) {
            setRowSaveError('Enter a Container number before saving the row.');
            return;
        }
        setSavedContainerRows((previous) => new Set(previous).add(rowId));
    };

    const saveWarehouseRow = (rowId, index) => {
        if (!watchedWarehouses[index]?.warehouseNo?.receiptId) {
            setRowSaveError('Select a Warehouse receipt before saving the row.');
            return;
        }
        setSavedWarehouseRows((previous) => new Set(previous).add(rowId));
    };

    const handleEdit = () => {
        setSavedContainerRows(new Set(containerFields.map((item) => item.id)));
        setSavedWarehouseRows(new Set(warehouseFields.map((item) => item.id)));
        setIsEditing(true);
    };

    const handleCancel = () => {
        if (viewMode && isEditing) {
            setCloseFormAfterDiscard(false);
            setCancelEditDialogOpen(true);
            return;
        }

        handleClose();
    };

    const handleHeaderClose = () => {
        if (viewMode && isEditing) {
            setCloseFormAfterDiscard(true);
            setCancelEditDialogOpen(true);
            return;
        }
        handleClose();
    };

    const handleDiscardChanges = () => {
        reset(defaultValues);
        setBarcodeValue(rowData?.barcodeNumber || '');
        setCustomerSearchValue(rowData?.customerName || rowData?.customer || String(rowData?.customerId || ''));
        setStationSearchValue(rowData?.stationName || rowData?.station || String(rowData?.stationId || ''));
        setSubmitError('');
        setRowSaveError('');
        setCancelEditDialogOpen(false);
        if (closeFormAfterDiscard) {
            handleClose();
        } else {
            setIsEditing(false);
        }
        setCloseFormAfterDiscard(false);
    };

    const onSubmit = async (data) => {
        const hasUnsavedContainerRows = containerFields.some((item) => !savedContainerRows.has(item.id));
        const hasUnsavedWarehouseRows = warehouseFields.some((item) => !savedWarehouseRows.has(item.id));

        if (hasUnsavedContainerRows || hasUnsavedWarehouseRows) {
            const unsavedTables = [
                hasUnsavedContainerRows ? 'Container' : '',
                hasUnsavedWarehouseRows ? 'Warehouse' : '',
            ].filter(Boolean).join(' and ');
            setRowSaveError(`Save all ${unsavedTables} rows before submitting the form.`);
            return;
        }

        const selectedReceipts = data.warehouses
            .filter((item) => item.warehouseNo?.receiptId)
            .map((item) => ({ receiptId: Number(item.warehouseNo.receiptId) }));

        if (selectedReceipts.length === 0) {
            setWarehouseReceiptError(true);
            setSubmitError('At least one Warehouse receipt is required.');
            return;
        }

        const payload = {
            shipmentType: 'AIR',
            barcodeNumber: data.rmProNo,
            customerId: Number(data.customer?.customerId || data.customer?.id || 0),
            stationId: Number(data.station?.stationId || data.station?.id || 0),
            consigneeId: Number(data.consignee?.airlineId || data.consignee?.id || 0),
            airBillNumber: data.airBill,
            booking: data.booking,
            customerRefNumber: data.customerRefNumber,
            additionalRefNumber: data.additionalRefNo,
            pieces: totalPieces,
            weight: totalWeight,
            instructions: data.instructions,
            ...(viewMode ? {
                isCanceled: rowData?.isCanceled || 'N',
                isShipped: rowData?.isShipped || 'N',
                isScanned: rowData?.isScanned || 'N',
                pickupEntry: rowData?.pickupEntry || 'N',
                pickupEntryNumber: rowData?.pickupEntryNumber || '',
            } : {}),
            containers: data.containers
                .filter((item) => String(item.containerNo || '').trim())
                .map((item) => ({ container: String(item.containerNo).trim() })),
            receipts: selectedReceipts,
        };

        const shipmentId = rowData?.shipmentId || rowData?.id;
        const result = viewMode
            ? await dispatch(updateShipment(shipmentId, payload))
            : await dispatch(postShipment(payload));
        if (result?.success) {
            if (viewMode) {
                setIsEditing(false);
            } else {
                handleClose();
            }
            return;
        }
        setSubmitError(result?.error || `Failed to ${viewMode ? 'update' : 'create'} shipment`);
    };

    const onInvalid = () => {
        setSubmitError('Please fill all mandatory fields before submitting');
    };

    return (
        <ShipmentFormLayout
            title={viewMode ? 'View Air Shipment Form' : 'New Air Shipment Form'}
            handleClose={handleHeaderClose}
            onCancel={handleCancel}
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            submitLoading={createShipmentLoading}
            submitLabel={viewMode ? 'Save' : 'Submit'}
            submitLoadingLabel={viewMode ? 'Saving...' : 'Submitting...'}
            showSubmit={!viewMode || isEditing}
            readOnly={viewMode && !isEditing}
            stickyHeader={viewMode}
            topInfoPanel={
                <TopInfoPanel 
                    showBarcodeGraphic={false} // Hides the barcode to match the Air mockup
                    barcodeValue={barcodeValue}
                    onBarcodeGenerate={() => setBarcodeValue(rmProValue)}
                    showEdit={viewMode && !isEditing}
                    editDisabled={rowData?.completeStatus === 'APPROVED'}
                    onEdit={handleEdit}
                    showNotes={viewMode && !isEditing}
                    onNotes={handleOpenNotes}
                    rmProInputNode={
                        <Controller
                            name="rmProNo"
                            control={control}
                            rules={{ required: 'RM PRO Number is required' }}
                            render={({ field, fieldState: { error } }) => (
                                <Box sx={{ bgcolor: '#fff', borderRadius: 0.5 }}>
                                    <StyledTextField
                                        {...field}
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        error={!!error}
                                        helperText={error?.message}
                                        sx={{ '& .MuiOutlinedInput-root': { height: '30px' } }}
                                    />
                                </Box>
                            )}
                        />
                    }
                />
            }
        >
            <Stack spacing={4}>
                {/* Customer Details */}
                <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
                    <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Customer Details</Typography></legend>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                        <Controller name="customer" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <Autocomplete
                                fullWidth
                                readOnly={viewMode}
                                options={customerOptions}
                                value={field.value}
                                inputValue={customerSearchValue}
                                loading={customerLoading}
                                getOptionLabel={getCustomerOptionLabel}
                                isOptionEqualToValue={(option, value) =>
                                    String(option?.customerId || option?.id || '') === String(value?.customerId || value?.id || '')
                                }
                                onInputChange={(event, newInputValue, reason) => {
                                    if (reason !== 'reset') setCustomerSearchValue(newInputValue);
                                }}
                                onChange={(event, newValue) => {
                                    field.onChange(newValue);
                                    setCustomerSearchValue(getCustomerOptionLabel(newValue));
                                    setStationSearchValue('');
                                    setValue('station', null, { shouldValidate: true });
                                }}
                                loadingText="Searching customers..."
                                noOptionsText={customerSearchValue ? 'No customers found' : 'Type to search for customers'}
                                renderInput={(params) => (
                                    <StyledTextField
                                        {...params}
                                        variant="standard"
                                        label="Customer / Freight Forwarder *"
                                        error={!!error}
                                        helperText={error?.message}
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
                            />
                        )} />
                        <Controller name="station" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <Autocomplete
                                fullWidth
                                readOnly={viewMode}
                                options={stationOptions}
                                value={field.value}
                                inputValue={stationSearchValue}
                                disabled={!selectedCustomerId}
                                loading={stationLoading}
                                getOptionLabel={getStationOptionLabel}
                                isOptionEqualToValue={(option, value) =>
                                    String(option?.stationId || option?.id || '') === String(value?.stationId || value?.id || '')
                                }
                                onInputChange={(event, newInputValue, reason) => {
                                    if (reason !== 'reset') setStationSearchValue(newInputValue);
                                }}
                                onChange={(event, newValue) => {
                                    setValue('station', newValue, {
                                        shouldDirty: true,
                                        shouldTouch: true,
                                        shouldValidate: true,
                                    });
                                    setStationSearchValue(getStationOptionLabel(newValue));
                                    if (newValue) clearErrors('station');
                                }}
                                loadingText="Searching stations..."
                                noOptionsText={selectedCustomerId
                                    ? stationSearchValue ? 'No stations found' : 'Type to search for stations'
                                    : 'Select a customer first'}
                                renderInput={(params) => (
                                    <StyledTextField
                                        {...params}
                                        variant="standard"
                                        label="Station *"
                                        error={!!error}
                                        helperText={error?.message}
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
                            />
                        )} />
                        <Controller name="airBill" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Air Bill *" error={!!error} />
                        )} />
                        <Controller name="consignee" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <Autocomplete
                                fullWidth
                                options={exportAirlineOptions}
                                value={field.value}
                                loading={exportAirlineLoading}
                                onOpen={() => dispatch(getExportAirlineOptions())}
                                getOptionLabel={getConsigneeOptionLabel}
                                isOptionEqualToValue={(option, value) =>
                                    String(option?.airlineId || option?.id || '') === String(value?.airlineId || value?.id || '')
                                }
                                onChange={(event, newValue) => field.onChange(newValue)}
                                loadingText="Loading consignees..."
                                noOptionsText="No consignees found"
                                renderInput={(params) => (
                                    <StyledTextField
                                        {...params}
                                        variant="standard"
                                        label="Consignee *"
                                        error={!!error}
                                        helperText={error?.message}
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
                        )} />
                    </Stack>
                </fieldset>

                {/* Booking Details */}
                <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
                    <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Booking Details</Typography></legend>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                        <Controller name="booking" control={control} render={({ field }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Booking" />
                        )} />
                        <Controller name="customerRefNumber" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Customer Ref Number *" error={!!error} />
                        )} />
                        <Controller name="additionalRefNo" control={control} render={({ field }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Additional Ref No" />
                        )} />
                    </Stack>
                </fieldset>

                {/* Instructions */}
                <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px'}}>
                    <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Instructions</Typography></legend>
                    <Controller name="instructions" control={control} render={({ field }) => (
                        <StyledTextField {...field} variant="standard" fullWidth multiline InputProps={{ disableUnderline: true }} sx={{ '& .MuiInputBase-root': { padding: 0 } }} />
                    )} />
                </fieldset>

                {/* Dynamic Lists Section (Container & Warehouse) */}
               <Grid container spacing={4} sx={{ width: '100%' }}>
                    {/* Container Table */}
                   <Grid item xs={12} md={6} sx={{ flex: 1 }}>
                        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                            <Stack direction="row" sx={{ bgcolor: '#dbdbdb', p: 1 }}>
                                <Typography sx={{ width: '15%', fontWeight: 600, fontSize: '13px' }}>Sno</Typography>
                                <Typography sx={{ width: '65%', fontWeight: 600, fontSize: '13px' }}>Container #</Typography>
                                <Typography sx={{ width: '20%', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>Actions</Typography>
                            </Stack>
                            {containerFields.map((item, index) => (
                                <Stack direction="row" alignItems="center" sx={{ p: 1 }} key={item.id}>
                                    <Box sx={{ width: '15%' }}>
                                        <Box sx={{ bgcolor: '#e0e0e0', p: '4px 8px', borderRadius: 1, display: 'inline-block', fontSize: '13px' }}>
                                            {String(index + 1).padStart(2, '0')}
                                        </Box>
                                    </Box>
                                    <Box sx={{ width: '65%' }}>
                                        <Controller name={`containers.${index}.containerNo`} control={control} render={({ field }) => (
                                            <StyledTextField
                                                {...field}
                                                onChange={(event) => {
                                                    field.onChange(event);
                                                    markContainerUnsaved(item.id);
                                                }}
                                                fullWidth
                                                size="small"
                                                sx={{ bgcolor: '#e0e0e0', borderRadius: 1, '& fieldset': { border: 'none' } }}
                                            />
                                        )} />
                                    </Box>
                                    <Box sx={{ width: '20%', display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                        <IconButton size="small" onClick={() => removeContainer(index)} sx={{ color: '#000' }}>
                                            <Iconify icon="mingcute:delete-2-fill" width={18} />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => saveContainerRow(item.id, index)}
                                            color={savedContainerRows.has(item.id) ? 'success' : 'default'}
                                            sx={savedContainerRows.has(item.id) ? undefined : { color: '#000' }}
                                        >
                                            <Iconify icon="material-symbols:save" width={18} />
                                        </IconButton>
                                    </Box>
                                </Stack>
                            ))}
                            <Box sx={{ p: 1, textAlign: 'right' }}>
                                <IconButton
                                    size="small"
                                    disabled={containerFields.length > 0 && !savedContainerRows.has(containerFields[containerFields.length - 1]?.id)}
                                    onClick={() => appendContainer({ containerNo: '' })}
                                    sx={{ bgcolor: '#A22', color: '#fff', borderRadius: '4px', p: '3px', '&:hover': { bgcolor: '#8b1c1c' }, '&.Mui-disabled': { bgcolor: '#ddd' } }}
                                >
                                    <Iconify icon="akar-icons:plus" width={16} />
                                </IconButton>
                            </Box>
                        </Box>
                    </Grid>

                    {/* Warehouse Table */}
                    <Grid item xs={12} md={6} sx={{ flex: 1 }}>
                        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                            <Stack direction="row" sx={{ bgcolor: '#dbdbdb', p: 1 }}>
                                <Typography sx={{ width: '8%', fontWeight: 600, fontSize: '13px', pl: 1 }}>Sno</Typography>
                                <Typography sx={{ width: '25%', fontWeight: 600, fontSize: '13px' }}>Warehouse #</Typography>
                                <Typography sx={{ width: '12%', fontWeight: 600, fontSize: '13px' }}>Pieces</Typography>
                                <Typography sx={{ width: '15%', fontWeight: 600, fontSize: '13px' }}>Weight (lbs)</Typography>
                                <Typography sx={{ width: '10%', fontWeight: 600, fontSize: '13px' }}>Items</Typography>
                                <Typography sx={{ width: '15%', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>Status</Typography>
                                <Typography sx={{ width: '15%', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>Actions</Typography>
                            </Stack>
                            {warehouseFields.map((item, index) => (
                                <Stack direction="row" alignItems="center" sx={{ p: 1, borderBottom: '1px solid #f0f0f0' }} key={item.id}>
                                    <Box sx={{ width: '8%', pl: 1 }}>
                                        <Typography sx={{ fontSize: '13px', color: '#555' }}>
                                            {String(index + 1).padStart(2, '0')}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ width: '25%', pr: 1 }}>
                                        <Controller name={`warehouses.${index}.warehouseNo`} control={control} render={({ field }) => (
                                            <Autocomplete
                                                fullWidth
                                                size="small"
                                                options={canSelectWarehouse ? shipmentReceiptOptionsByField[item.id] || [] : []}
                                                value={field.value}
                                                inputValue={receiptInputValues[item.id] || ''}
                                                readOnly={!canSelectWarehouse}
                                                openOnFocus={canSelectWarehouse}
                                                loading={Boolean(shipmentReceiptLoadingByField[item.id])}
                                                getOptionLabel={getShipmentReceiptOptionLabel}
                                                isOptionEqualToValue={(option, value) =>
                                                    String(option?.receiptId || option?.receiptNumber || '') === String(value?.receiptId || value?.receiptNumber || '')
                                                }
                                                onInputChange={(event, newInputValue, reason) => {
                                                    setReceiptInputValues((prev) => ({
                                                        ...prev,
                                                        [item.id]: newInputValue,
                                                    }));
                                                    handleReceiptSearch(item.id, newInputValue, reason);
                                                }}
                                                onChange={(event, newValue) => {
                                                    markWarehouseUnsaved(item.id);
                                                    handleReceiptSelection(index, item.id, newValue);
                                                }}
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
                                                    <StyledTextField
                                                        {...params}
                                                        variant="standard"
                                                        placeholder="Type receipt number"
                                                        error={warehouseReceiptError && index === 0}
                                                        inputProps={{
                                                            ...params.inputProps,
                                                            readOnly: !canSelectWarehouse,
                                                            onMouseDown: (event) => {
                                                                if (!canSelectWarehouse) {
                                                                    event.preventDefault();
                                                                    setWarehouseAlertOpen(true);
                                                                }
                                                            },
                                                            onFocus: (event) => {
                                                                params.inputProps?.onFocus?.(event);
                                                                if (!canSelectWarehouse) {
                                                                    setWarehouseAlertOpen(true);
                                                                }
                                                            },
                                                        }}
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            disableUnderline: true,
                                                            endAdornment: (
                                                                <>
                                                                    {shipmentReceiptLoadingByField[item.id] ? <CircularProgress color="inherit" size={16} /> : null}
                                                                    {params.InputProps.endAdornment}
                                                                </>
                                                            ),
                                                        }}
                                                    />
                                                )}
                                            />
                                        )} />
                                    </Box>
                                    <Box sx={{ width: '12%', pr: 1 }}>
                                        <Controller name={`warehouses.${index}.pieces`} control={control} render={({ field }) => (
                                            <StyledTextField
                                                {...field}
                                                type="number"
                                                size="small"
                                                variant="standard"
                                                InputProps={{ disableUnderline: true, readOnly: true }}
                                                sx={{ bgcolor: 'transparent' }}
                                            />
                                        )} />
                                    </Box>
                                    <Box sx={{ width: '15%', pr: 1 }}>
                                        <Controller name={`warehouses.${index}.weight`} control={control} render={({ field }) => (
                                            <StyledTextField
                                                {...field}
                                                type="number"
                                                size="small"
                                                variant="standard"
                                                InputProps={{ disableUnderline: true, readOnly: true }}
                                                sx={{ bgcolor: 'transparent' }}
                                            />
                                        )} />
                                    </Box>
                                    <Box sx={{ width: '10%', pr: 1 }}>
                                        <Box
                                            component="span"
                                            sx={{ px: 0.5, py: 0.25, borderRadius: 0.5, fontWeight: 700, ...statusStyles[getReceiptStatus(watchedWarehouses[index]?.warehouseNo)] }}
                                        >
                                            {Number(watchedWarehouses[index]?.warehouseNo?.freightSummary?.scanned || 0)}/
                                            {Number(watchedWarehouses[index]?.warehouseNo?.freightSummary?.total || watchedWarehouses[index]?.warehouseNo?.piecesInland || 0)}
                                        </Box>
                                    </Box>
                                    <Box sx={{ width: '15%', pr: 1, textAlign: 'center' }}>
                                        <Box
                                            component="span"
                                            sx={{ display: 'inline-block', minWidth: 72, px: 1, py: 0.25, borderRadius: 5, textAlign: 'center', fontSize: 11, ...statusStyles[getReceiptStatus(watchedWarehouses[index]?.warehouseNo)] }}
                                        >
                                            {getReceiptStatus(watchedWarehouses[index]?.warehouseNo)}
                                        </Box>
                                    </Box>
                                    <Box sx={{ width: '15%', display: 'flex', justifyContent: 'center', gap: 0.25 }}>
                                        {getReceiptStatus(watchedWarehouses[index]?.warehouseNo) === 'Available' && (
                                            <>
                                                <IconButton size="small" onClick={() => removeWarehouse(index)} sx={{ color: '#000', p: 0.5 }}>
                                                    <Iconify icon="mingcute:delete-2-fill" width={18} />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => saveWarehouseRow(item.id, index)}
                                                    color={savedWarehouseRows.has(item.id) ? 'success' : 'default'}
                                                    sx={{ p: 0.5, color: savedWarehouseRows.has(item.id) ? 'success.main' : '#000' }}
                                                >
                                                    <Iconify icon="material-symbols:save" width={18} />
                                                </IconButton>
                                            </>
                                        )}
                                    </Box>
                                </Stack>
                            ))}

                            <Box sx={{ p: 1, textAlign: 'right' }}>
                                <IconButton
                                    size="small"
                                    disabled={warehouseFields.length > 0 && !savedWarehouseRows.has(warehouseFields[warehouseFields.length - 1]?.id)}
                                    onClick={() => appendWarehouse({ warehouseNo: null, pieces: '', weight: '' })}
                                    sx={{ bgcolor: '#A22', color: '#fff', borderRadius: '4px', p: '3px', '&:hover': { bgcolor: '#8b1c1c' }, '&.Mui-disabled': { bgcolor: '#ddd' } }}
                                >
                                    <Iconify icon="akar-icons:plus" width={16} />
                                </IconButton>
                            </Box>

                            <Stack direction="row" alignItems="center" sx={{ p: 1, borderTop: '2px solid #e0e0e0', mt: 1 }}>
                                <Box sx={{ width: '8%' }} />
                                <Box sx={{ width: '25%' }} />
                                <Box sx={{ width: '12%' }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>{totalPieces}</Typography>
                                </Box>
                                <Box sx={{ width: '15%' }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>{totalWeight}</Typography>
                                </Box>
                                <Box sx={{ width: '15%' }} />
                                <Box sx={{ width: '15%' }} />
                                <Box sx={{ width: '10%' }} />
                            </Stack>
                        </Box>
                    </Grid>
                </Grid>
            </Stack>
            <Snackbar
                open={Boolean(rowSaveError)}
                autoHideDuration={3500}
                onClose={(event, reason) => {
                    if (reason !== 'clickaway') setRowSaveError('');
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="warning" variant="filled" onClose={() => setRowSaveError('')}>
                    {rowSaveError}
                </Alert>
            </Snackbar>
            <Snackbar
                open={warehouseAlertOpen}
                autoHideDuration={3500}
                onClose={handleWarehouseAlertClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="warning" variant="filled" onClose={handleWarehouseAlertClose}>
                    Please select Customer and Station before selecting a Warehouse receipt.
                </Alert>
            </Snackbar>
            <Snackbar
                open={duplicateReceiptAlertOpen}
                autoHideDuration={3500}
                onClose={(event, reason) => {
                    if (reason !== 'clickaway') setDuplicateReceiptAlertOpen(false);
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    severity="warning"
                    variant="filled"
                    onClose={() => setDuplicateReceiptAlertOpen(false)}
                >
                    This receipt is already available in the Warehouse table.
                </Alert>
            </Snackbar>
            <Dialog
                open={Boolean(pendingReceiptSelection)}
                onClose={() => setPendingReceiptSelection(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Station mismatch</DialogTitle>
                <DialogContent>
                    The selected receipt belongs to a different station than the station selected
                    in Customer Details. Do you want to proceed?
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingReceiptSelection(null)} color="inherit">
                        No
                    </Button>
                    <Button onClick={handleConfirmReceiptSelection} variant="contained" color="warning">
                        Yes, proceed
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={cancelEditDialogOpen}
                onClose={() => {
                    setCancelEditDialogOpen(false);
                    setCloseFormAfterDiscard(false);
                }}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Discard unsaved changes?</DialogTitle>
                <DialogContent>
                    Your changes have not been saved. Do you want to discard them?
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setCancelEditDialogOpen(false);
                        setCloseFormAfterDiscard(false);
                    }} color="inherit">
                        Keep Editing
                    </Button>
                    <Button onClick={handleDiscardChanges} variant="contained" sx={{ bgcolor: '#A22', '&:hover': { bgcolor: '#8b1c1c' } }}>
                        Discard
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={Boolean(submitError)}
                autoHideDuration={5000}
                onClose={(event, reason) => {
                    if (reason !== 'clickaway') setSubmitError('');
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="error" variant="filled" onClose={() => setSubmitError('')}>
                    {submitError}
                </Alert>
            </Snackbar>
            <Dialog
                open={notesDialogOpen}
                onClose={() => setNotesDialogOpen(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{ sx: { borderRadius: 1, minHeight: 430 } }}
            >
                <DialogContent sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #777', pb: 0.8 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Shipment Notes</Typography>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => setNotesDialogOpen(false)}
                            sx={{ bgcolor: '#A22', height: 24, minWidth: 58, fontSize: 11, '&:hover': { bgcolor: '#8b1c1c' } }}
                        >
                            OK
                        </Button>
                    </Stack>

                    <Box sx={{ mt: 2.2, maxWidth: '100%' }}>
                        <TextField
                            variant="standard"
                            label={(
                                <Box component="span">
                                    Notes <Box component="span" sx={{ color: '#A22' }}>*</Box>
                                </Box>
                            )}
                            value={noteText}
                            onChange={(event) => setNoteText(event.target.value)}
                            fullWidth
                            size="small"
                            sx={{
                                '& .MuiInputLabel-root': { fontSize: 11 },
                                '& .MuiInputBase-input': { fontSize: 12, py: 0.2 },
                            }}
                        />
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleAddNote}
                            disabled={receiptNotesSaving}
                            sx={{ mt: 0.8, height: 24, minWidth: 82, bgcolor: '#A22', fontSize: 11, '&:hover': { bgcolor: '#8b1c1c' } }}
                        >
                            {receiptNotesSaving ? 'Saving...' : 'Add Notes'}
                        </Button>
                    </Box>

                    <Table
                        size="small"
                        sx={{
                            mt: 3,
                            border: '1px solid #d0d0d0',
                            '& th': { bgcolor: '#f5f5f5', fontSize: 11, fontWeight: 500 },
                            '& td': { fontSize: 12, verticalAlign: 'top' },
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 190 }}>Time</TableCell>
                                <TableCell sx={{ width: 120 }}>User</TableCell>
                                <TableCell>Notes</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {receiptNotesLoading ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : receiptNotesError ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center" sx={{ py: 3, color: '#A22' }}>
                                        {receiptNotesError}
                                    </TableCell>
                                </TableRow>
                            ) : receiptNotes.length ? (
                                receiptNotes.map((note, index) => (
                                    <TableRow key={note.noteMessageId || `${note.createdAt}-${note.createdBy}-${index}`}>
                                        <TableCell>{formatNoteTime(note.createdAt)}</TableCell>
                                        <TableCell>{note.createdByName || note.createdBy || ''}</TableCell>
                                        <TableCell>{note.messageText || ''}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} align="center" sx={{ py: 3 }}>No notes found</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </DialogContent>
            </Dialog>
            <Snackbar
                open={Boolean(notesMessage)}
                autoHideDuration={4000}
                onClose={(event, reason) => {
                    if (reason !== 'clickaway') setNotesMessage('');
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="error" variant="filled" onClose={() => setNotesMessage('')}>
                    {notesMessage}
                </Alert>
            </Snackbar>
        </ShipmentFormLayout>
    );
}
