import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Autocomplete, CircularProgress, Typography, Stack, Grid, IconButton, Box } from '@mui/material';

import StyledTextField from '../../sections/shared/StyledTextField';
import Iconify from '../../components/iconify';
import ShipmentFormLayout, { TopInfoPanel } from '../../sections/shared/ShipmentFormLayout';

import { useDispatch, useSelector } from '../../redux/store';
import { searchWarehouseReceiptCustomers, searchWarehouseReceiptStations } from '../../redux/slices/warehouseReceipt';
import { getExportAirlineOptions, getShipmentReceiptOptions, postShipment } from '../../redux/slices/shipment';

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

NewOceanLCLShipmentForm.propTypes = {
    handleClose: PropTypes.func.isRequired,
    rowData: PropTypes.object,
    viewMode: PropTypes.bool,
};

export default function NewOceanLCLShipmentForm({ handleClose, rowData = null, viewMode = false }) {
    const dispatch = useDispatch();
    const { customerOptions, customerLoading, stationOptions, stationLoading } = useSelector((state) => state.warehouseReceiptdata);
    const { exportAirlineOptions, exportAirlineLoading, shipmentReceiptOptionsByField, shipmentReceiptLoadingByField, createShipmentLoading } = useSelector((state) => state.shipmentdata);
    const defaultValues = {
        rmProNo: rowData?.barcodeNumber || '',
        customer: rowData ? { customerId: rowData.customerId, customerName: rowData.customerName || rowData.customer || String(rowData.customerId || '') } : null,
        station: rowData ? { stationId: rowData.stationId, stationName: rowData.stationName || rowData.station || String(rowData.stationId || '') } : null,
        consignee: rowData ? {
            airlineId: rowData.consigneeId || rowData.airlineId,
            airlineName: rowData.airlineName || rowData.consigneeName || String(rowData.consigneeId || ''),
            airlineCode: rowData.airlineCode || '',
            airlineNumber: rowData.airlineNumber || '',
            airportCode: rowData.airportCode || '',
        } : null,
        booking: rowData?.booking || '',
        customerRefNumber: rowData?.customerRefNumber || '',
        additionalRefNo: rowData?.additionalRefNumber || '',
        instructions: rowData?.instructions || '',
        warehouses: rowData?.receipts?.length
            ? rowData.receipts.map((item) => ({
                warehouseNo: { ...item, receiptNumber: item.receiptNumber || item.receiptId || '' },
                pieces: item.pieces ?? item.piecesInland ?? '',
                weight: item.weight ?? item.reWeight ?? '',
            }))
            : [{ warehouseNo: null, pieces: rowData?.pieces || '', weight: rowData?.weight || '' }],
    };

    const { control, handleSubmit, watch, setValue, clearErrors } = useForm({ defaultValues });

    const [barcodeValue, setBarcodeValue] = useState('');
    const [customerSearchValue, setCustomerSearchValue] = useState(rowData?.customerName || rowData?.customer || String(rowData?.customerId || ''));
    const [stationSearchValue, setStationSearchValue] = useState(rowData?.stationName || rowData?.station || String(rowData?.stationId || ''));
    const [warehouseAlertOpen, setWarehouseAlertOpen] = useState(false);
    const [duplicateReceiptAlertOpen, setDuplicateReceiptAlertOpen] = useState(false);
    const [pendingReceiptSelection, setPendingReceiptSelection] = useState(null);
    const [warehouseReceiptError, setWarehouseReceiptError] = useState(false);
    const [receiptInputValues, setReceiptInputValues] = useState({});
    const [receiptSearchSubmitted, setReceiptSearchSubmitted] = useState({});
    const [savedWarehouseRows, setSavedWarehouseRows] = useState(() => new Set());
    const [submitError, setSubmitError] = useState('');
    const [rowSaveError, setRowSaveError] = useState('');
    const receiptSearchTimers = useRef({});

    const rmProValue = useWatch({ control, name: 'rmProNo' });

    const selectedCustomer = useWatch({ control, name: 'customer' });
    const selectedStation = useWatch({ control, name: 'station' });
    const selectedStationId = selectedStation?.stationId || selectedStation?.id || '';
    const selectedCustomerId = selectedCustomer?.customerId || selectedCustomer?.id || '';

    const canSelectWarehouse = Boolean(selectedCustomerId && selectedStationId) && !viewMode;

    const handleWarehouseAlertClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setWarehouseAlertOpen(false);
    };

    useEffect(() => () => {
        Object.values(receiptSearchTimers.current).forEach(clearTimeout);
    }, []);

    const handleReceiptSearch = (fieldKey, value, reason) => {
        if (reason === 'reset') return;
        setReceiptSearchSubmitted((prev) => ({ ...prev, [fieldKey]: false }));
        if (!selectedCustomerId || !selectedStationId) {
            if (value) setWarehouseAlertOpen(true);
            return;
        }
        if (receiptSearchTimers.current[fieldKey]) clearTimeout(receiptSearchTimers.current[fieldKey]);
        receiptSearchTimers.current[fieldKey] = setTimeout(() => {
            setReceiptSearchSubmitted((prev) => ({
                ...prev,
                [fieldKey]: Boolean(String(value || '').trim()),
            }));
            dispatch(getShipmentReceiptOptions(value, fieldKey, { shipmentType: 'OCEAN_LCL' }));
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

    const { fields: warehouseFields, append: appendWarehouse, remove: removeWarehouse } = useFieldArray({
        control,
        name: "warehouses"
    });

    // Watch the warehouses array to dynamically calculate the totals in the footer
    const watchedWarehouses = watch("warehouses");
    const totalPieces = watchedWarehouses.reduce((sum, item) => sum + (Number(item.pieces) || 0), 0);
    const totalWeight = watchedWarehouses.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);

    const markWarehouseUnsaved = (rowId) => {
        setSavedWarehouseRows((previous) => {
            const next = new Set(previous);
            next.delete(rowId);
            return next;
        });
    };

    const saveWarehouseRow = (rowId, index) => {
        if (!watchedWarehouses[index]?.warehouseNo?.receiptId) {
            setRowSaveError('Select a Warehouse receipt before saving the row.');
            return;
        }
        setSavedWarehouseRows((previous) => new Set(previous).add(rowId));
    };

    const onSubmit = async (data) => {
        if (createShipmentLoading) return;
        setSubmitError('');
        const selectedReceipts = data.warehouses
            .filter((item) => item.warehouseNo?.receiptId)
            .map((item) => ({ receiptId: Number(item.warehouseNo.receiptId) }));

        if (selectedReceipts.length === 0) {
            setWarehouseReceiptError(true);
            setSubmitError('At least one Warehouse receipt is required.');
            return;
        }

        if (warehouseFields.some((item) => !savedWarehouseRows.has(item.id))) {
            setRowSaveError('Save all Warehouse rows before submitting the form.');
            return;
        }

        const payload = {
            shipmentType: 'OCEAN_LCL',
            destination: null,
            earlyReturnDate: '',
            dropByDate: '',
            manifestType: 'DIRECT',
            stationScope: 'SPECIFIC',
            startDate: '',
            endDate: '',
            barcodeNumber: data.rmProNo,
            customerId: Number(data.customer?.customerId || data.customer?.id || 0),
            stationId: Number(data.station?.stationId || data.station?.id || 0),
            consigneeId: Number(data.consignee?.airlineId || data.consignee?.id || 0),
            booking: data.booking,
            customerRefNumber: data.customerRefNumber,
            additionalRefNumber: data.additionalRefNo,
            pieces: totalPieces,
            weight: totalWeight,
            instructions: data.instructions,
            containers: [],
            receipts: selectedReceipts,
        };

        const result = await dispatch(postShipment(payload));
        if (result?.success) {
            handleClose();
            return;
        }
        setSubmitError(result?.error || 'Failed to create shipment');
    };

    const onInvalid = () => {
        setSubmitError('Please fill all mandatory fields before submitting');
    };

    return (
        <ShipmentFormLayout
            title={viewMode ? 'View Ocean LCL Shipment Form' : 'New Ocean LCL Shipment Form'}
            handleClose={handleClose}
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            submitLoading={createShipmentLoading}
            showSubmit={!viewMode}
            readOnly={viewMode}
            topInfoPanel={
                <TopInfoPanel 
                    showBarcodeGraphic={false}
                    barcodeValue={barcodeValue}
                    onBarcodeGenerate={() => setBarcodeValue(rmProValue)}
                    rmProInputNode={
                        <Controller
                            name="rmProNo"
                            control={control}
                            render={({ field }) => (
                                <Box sx={{ bgcolor: '#fff', borderRadius: 0.5 }}>
                                    <StyledTextField {...field} variant="outlined" size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { height: '30px' } }} />
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
                        <Controller name="consignee" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <Autocomplete
                                fullWidth
                                readOnly={viewMode}
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
                <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px', width: '60%' }}>
                    <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Instructions</Typography></legend>
                    <Controller name="instructions" control={control} render={({ field }) => (
                        <StyledTextField {...field} variant="standard" fullWidth multiline InputProps={{ disableUnderline: true }} sx={{ '& .MuiInputBase-root': { padding: 0 } }} />
                    )} />
                </fieldset>

                <Grid container spacing={4}>
                    {/* Warehouse Table */}
                    <Grid item xs={12} sx={{ flex: 1 }}>
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
                                                noOptionsText={receiptSearchSubmitted[item.id] ? 'No receipt found' : 'Type a receipt number'}
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
            <Snackbar
                open={Boolean(submitError)}
                autoHideDuration={4000}
                onClose={(event, reason) => {
                    if (reason !== 'clickaway') setSubmitError('');
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="error" variant="filled" onClose={() => setSubmitError('')}>
                    {submitError}
                </Alert>
            </Snackbar>
        </ShipmentFormLayout>
    );
}
