import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import {
    Alert, Autocomplete, Button, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogTitle, Snackbar, Typography, Stack, Grid, IconButton, Box
} from '@mui/material';

import StyledTextField from '../../sections/shared/StyledTextField';
import Iconify from '../../components/iconify';
import ShipmentFormLayout, { TopInfoPanel } from '../../sections/shared/ShipmentFormLayout';
import { useDispatch, useSelector } from '../../redux/store';
import {
    searchWarehouseReceiptCustomers,
    searchWarehouseReceiptStations,
} from '../../redux/slices/warehouseReceipt';
import {
    getExportAirlineOptions,
    getShipmentReceiptOptions,
    postShipment,
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
        customer: rowData ? { customerId: rowData.customerId, customerName: rowData.customerName || rowData.customer || '' } : null,
        station: rowData ? { stationId: rowData.stationId, stationName: rowData.stationName || rowData.station || '' } : null,
        airBill: rowData?.airBillNumber || '',
        consignee: rowData ? {
            airlineId: rowData.consigneeId || rowData.airlineId,
            airlineName: rowData.airlineName || '',
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
                warehouseNo: item,
                pieces: item.pieces ?? item.piecesInland ?? '',
                weight: item.weight ?? item.reWeight ?? '',
            }))
            : [{ warehouseNo: null, pieces: rowData?.pieces || '', weight: rowData?.weight || '' }],
    };

    const { control, handleSubmit, setValue, clearErrors } = useForm({ defaultValues });

    const [barcodeValue, setBarcodeValue] = useState(viewMode ? rowData?.barcodeNumber || '' : '');
    const [customerSearchValue, setCustomerSearchValue] = useState(rowData?.customerName || rowData?.customer || '');
    const [stationSearchValue, setStationSearchValue] = useState(rowData?.stationName || rowData?.station || '');
    const [warehouseAlertOpen, setWarehouseAlertOpen] = useState(false);
    const [duplicateReceiptAlertOpen, setDuplicateReceiptAlertOpen] = useState(false);
    const [pendingReceiptSelection, setPendingReceiptSelection] = useState(null);
    const [submitError, setSubmitError] = useState('');
    const [warehouseReceiptError, setWarehouseReceiptError] = useState(false);
    const [receiptInputValues, setReceiptInputValues] = useState({});
    const [savedContainerRows, setSavedContainerRows] = useState(() => new Set());
    const [savedWarehouseRows, setSavedWarehouseRows] = useState(() => new Set());
    const [rowSaveError, setRowSaveError] = useState('');
    const receiptSearchTimers = useRef({});

    const rmProValue = useWatch({ control, name: 'rmProNo' });
    const selectedCustomer = useWatch({ control, name: 'customer' });
    const selectedStation = useWatch({ control, name: 'station' });
    const selectedCustomerId = selectedCustomer?.customerId || selectedCustomer?.id || '';
    const selectedStationId = selectedStation?.stationId || selectedStation?.id || '';
    const canSelectWarehouse = Boolean(selectedCustomerId && selectedStationId);

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
            containers: data.containers
                .filter((item) => String(item.containerNo || '').trim())
                .map((item) => ({ container: String(item.containerNo).trim() })),
            receipts: selectedReceipts,
        };

        const result = await dispatch(postShipment(payload));
        if (result?.success) {
            handleClose();
            return;
        }
        setSubmitError(result?.error || 'Failed to create shipment');
    };

    return (
        <ShipmentFormLayout
            title={viewMode ? 'View Air Shipment Form' : 'New Air Shipment Form'}
            handleClose={handleClose}
            onSubmit={handleSubmit(onSubmit)}
            submitLoading={createShipmentLoading}
            showSubmit={!viewMode}
            readOnly={viewMode}
            topInfoPanel={
                <TopInfoPanel 
                    showBarcodeGraphic={false} // Hides the barcode to match the Air mockup
                    barcodeValue={barcodeValue}
                    onBarcodeGenerate={() => setBarcodeValue(rmProValue)}
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
                                <Typography sx={{ width: '10%', fontWeight: 600, fontSize: '13px', pl: 1 }}>Sno</Typography>
                                <Typography sx={{ width: '40%', fontWeight: 600, fontSize: '13px' }}>Warehouse #</Typography>
                                <Typography sx={{ width: '20%', fontWeight: 600, fontSize: '13px' }}>Pieces</Typography>
                                <Typography sx={{ width: '20%', fontWeight: 600, fontSize: '13px' }}>Weight (lbs)</Typography>
                                <Typography sx={{ width: '10%', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>Actions</Typography>
                            </Stack>
                            {warehouseFields.map((item, index) => (
                                <Stack direction="row" alignItems="center" sx={{ p: 1, borderBottom: '1px solid #f0f0f0' }} key={item.id}>
                                    <Box sx={{ width: '10%', pl: 1 }}>
                                        <Typography sx={{ fontSize: '13px', color: '#555' }}>
                                            {String(index + 1).padStart(2, '0')}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ width: '40%', pr: 1 }}>
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
                                    <Box sx={{ width: '20%', pr: 1 }}>
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
                                    <Box sx={{ width: '20%', pr: 1 }}>
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
                                    <Box sx={{ width: '10%', display: 'flex', justifyContent: 'center', gap: 0.25 }}>
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
                                <Box sx={{ width: '10%' }} />
                                <Box sx={{ width: '40%' }} />
                                <Box sx={{ width: '20%' }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>{totalPieces}</Typography>
                                </Box>
                                <Box sx={{ width: '20%' }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>{totalWeight}</Typography>
                                </Box>
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
        </ShipmentFormLayout>
    );
}
