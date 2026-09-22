import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { 
    Typography, Stack, Grid, IconButton, Box, MenuItem, 
    TextField, InputAdornment, Dialog, DialogTitle, DialogContent,
    Checkbox, Autocomplete, CircularProgress, Alert, Snackbar, DialogActions, Button
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import StyledTextField from '../../sections/shared/StyledTextField';
import Iconify from '../../components/iconify';
import axios from '../../utils/axios';
import { PATH_DASHBOARD } from '../../routes/paths';
import ShipmentFormLayout, { TopInfoPanel } from '../../sections/shared/ShipmentFormLayout';

import { useDispatch, useSelector } from '../../redux/store';
import { searchWarehouseReceiptCustomers, searchWarehouseReceiptStations } from '../../redux/slices/warehouseReceipt';
import { getExportAirlineOptions, getShipmentReceiptOptions, postShipment } from '../../redux/slices/shipment';

const ALL_STATIONS_OPTION = { stationScope: 'ALL', stationName: 'All' };

const getHazmatLabel = (receipt) => {
    const value = receipt.hazMat ?? receipt.hazmat ?? receipt.isHazmat;
    if (value == null || value === '') return '-';
    return ['yes', 'y', 'true', '1'].includes(String(value).toLowerCase()) ? 'Yes' : 'No';
};

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

NewOceanFCLShipmentForm.propTypes = {
    handleClose: PropTypes.func.isRequired,
    rowData: PropTypes.object,
    viewMode: PropTypes.bool,
};

export default function NewOceanFCLShipmentForm({ handleClose, rowData = null, viewMode = false }) {
    const dispatch = useDispatch();
    const { customerOptions, customerLoading, stationOptions, stationLoading } = useSelector((state) => state.warehouseReceiptdata);
    const { exportAirlineOptions, exportAirlineLoading, shipmentReceiptOptionsByField, shipmentReceiptLoadingByField, createShipmentLoading } = useSelector((state) => state.shipmentdata);

    const defaultValues = {
        rmProNo: String(rowData?.barcodeNumber || '').replace(/\s/g, ''),
        customer: rowData ? { customerId: rowData.customerId, customerName: rowData.customerName || rowData.customer || String(rowData.customerId || '') } : null,
        station: rowData?.stationId ? { stationId: rowData.stationId, stationName: rowData.stationName || rowData.station || String(rowData.stationId) } : rowData?.customerId ? ALL_STATIONS_OPTION : null,
        destination: rowData?.destination || '',
        consignee: rowData ? {
            airlineId: rowData.consigneeId || rowData.airlineId,
            airlineName: rowData.airlineName || rowData.consigneeName || String(rowData.consigneeId || ''),
            airlineCode: rowData.airlineCode || '',
            airlineNumber: rowData.airlineNumber || '',
            airportCode: rowData.airportCode || '',
            city: rowData.city || '',
            state: rowData.state || '',
        } : null,
        booking: rowData?.booking || '',
        customerRefNumber: rowData?.customerRefNumber || '',
        additionalRefNumber: rowData?.additionalRefNumber || '',
        earlyReturnDate: rowData?.earlyReturnDate ? dayjs(rowData.earlyReturnDate) : null,
        dropByDate: rowData?.dropByDate ? dayjs(rowData.dropByDate) : null,
        containerNo: rowData?.containers?.map((item) => item.container || item.containerNo).filter(Boolean).join(', ') || rowData?.containerNo || '',
        instructions: rowData?.instructions || '',
        loadManifestType: 'Direct Entry',
        warehouses: rowData?.receipts?.length
            ? rowData.receipts.map((item) => ({
                warehouseNo: { ...item, receiptNumber: item.receiptNumber || item.receiptId || '' },
                pieces: item.pieces ?? item.piecesInland ?? '',
                weight: item.weight ?? item.reWeight ?? '',
            }))
            : [{ warehouseNo: null, pieces: rowData?.pieces || '', weight: rowData?.weight || '' }],
        proNumbers: [],
        fromDate: dayjs('2026-02-26'), // Added for Date Selection
        toDate: dayjs('2026-03-26'),   // Added for Date Selection
    };

    const { control, handleSubmit, watch, setValue, clearErrors } = useForm({ defaultValues });

    const [barcodeValue, setBarcodeValue] = useState(viewMode ? defaultValues.rmProNo : '');
    const [openProModal, setOpenProModal] = useState(false);
    const [proOptions, setProOptions] = useState([]);
    const [proLoading, setProLoading] = useState(false);
    const [proError, setProError] = useState('');
    const [proSearch, setProSearch] = useState('');
    const [proFilter, setProFilter] = useState('');
    const [selectedProNumbers, setSelectedProNumbers] = useState([]);
    const [proDetailsOpen, setProDetailsOpen] = useState(false);
    const [proReceiptsConfirmed, setProReceiptsConfirmed] = useState(false);
    const pendingProRowsRef = useRef(false);
    const [detailReceiptIds, setDetailReceiptIds] = useState([]);
    const [detailProNumbers, setDetailProNumbers] = useState([]);
    const [destinationFilters, setDestinationFilters] = useState([]);
    const [warehouseFilter, setWarehouseFilter] = useState('');
    const [hazmatFilter, setHazmatFilter] = useState('');
    const [customerSearchValue, setCustomerSearchValue] = useState(rowData?.customerName || rowData?.customer || String(rowData?.customerId || ''));
    const [stationSearchValue, setStationSearchValue] = useState(getStationOptionLabel(defaultValues.station));
    const [destinationOptions, setDestinationOptions] = useState([]);
    const [destinationLoading, setDestinationLoading] = useState(false);
    const [destinationError, setDestinationError] = useState('');
    const [destinationRequestVersion, setDestinationRequestVersion] = useState(0);

    const [warehouseAlertOpen, setWarehouseAlertOpen] = useState(false);
    const [duplicateReceiptAlertOpen, setDuplicateReceiptAlertOpen] = useState(false);
    const [pendingReceiptSelection, setPendingReceiptSelection] = useState(null);
    const [warehouseReceiptError, setWarehouseReceiptError] = useState(false);
    const [receiptInputValues, setReceiptInputValues] = useState({});
    const [receiptSearchSubmitted, setReceiptSearchSubmitted] = useState({});
    const [savedWarehouseRows, setSavedWarehouseRows] = useState(() => new Set());
    const [rowSaveError, setRowSaveError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const submitInFlightRef = useRef(false);
    const receiptSearchTimers = useRef({});

    const rmProValue = useWatch({ control, name: 'rmProNo' });
    const selectedCustomer = useWatch({ control, name: 'customer' });
    const selectedStation = useWatch({ control, name: 'station' });
    const selectedDestination = useWatch({ control, name: 'destination' });
    const selectedStationId = selectedStation?.stationId || selectedStation?.id || '';
    const selectedCustomerId = selectedCustomer?.customerId || selectedCustomer?.id || '';

    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(searchWarehouseReceiptCustomers(customerSearchValue));
        }, 500);

        return () => clearTimeout(timer);
    }, [dispatch, customerSearchValue]);

    const stationSearchTerm = stationSearchValue === getStationOptionLabel(selectedStation) ? '' : stationSearchValue;
    const stationScope = selectedStation?.stationScope === 'ALL' ? 'ALL' : selectedStationId ? 'SPECIFIC' : '';

    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(searchWarehouseReceiptStations(selectedCustomerId, stationSearchTerm));
        }, 500);

        return () => clearTimeout(timer);
    }, [dispatch, selectedCustomerId, stationSearchTerm]);

    useEffect(() => {
        const controller = new AbortController();
        setDestinationOptions([]);
        setDestinationError('');
        setDestinationLoading(false);
        if (!selectedCustomerId || !stationScope || viewMode) return;

        setDestinationLoading(true);
        const params = { customerId: selectedCustomerId, stationScope };
        if (stationScope === 'SPECIFIC') params.stationId = selectedStationId;
        axios.get('/warehouse-receipt/destinations', { params, signal: controller.signal })
            .then(({ data }) => {
                if (controller.signal.aborted) return;
                if (!data?.success || !Array.isArray(data.data)) throw new Error('Invalid destination response');
                setDestinationOptions(data.data.filter((destination) => typeof destination === 'string'));
            })
            .catch(() => {
                if (!controller.signal.aborted) setDestinationError('Could not load destinations. Please select the station again to retry.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setDestinationLoading(false);
            });
        return () => controller.abort();
    }, [selectedCustomerId, selectedStationId, stationScope, viewMode, destinationRequestVersion]);

    const canSelectWarehouse = Boolean(selectedCustomerId && stationScope && selectedDestination);

    const handleWarehouseAlertClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setWarehouseAlertOpen(false);
    };

    useEffect(() => () => {
        Object.values(receiptSearchTimers.current).forEach(clearTimeout);
    }, [selectedCustomerId, stationScope, selectedStationId, selectedDestination]);

    const handleReceiptSearch = (fieldKey, value, reason) => {
        if (reason === 'reset') return;
        setReceiptSearchSubmitted((prev) => ({ ...prev, [fieldKey]: false }));
        if (!canSelectWarehouse) {
            if (value) setWarehouseAlertOpen(true);
            return;
        }
        if (receiptSearchTimers.current[fieldKey]) clearTimeout(receiptSearchTimers.current[fieldKey]);
        receiptSearchTimers.current[fieldKey] = setTimeout(() => {
            setReceiptSearchSubmitted((prev) => ({
                ...prev,
                [fieldKey]: Boolean(String(value || '').trim()),
            }));
            dispatch(getShipmentReceiptOptions(value, fieldKey, {
                shipmentType: 'OCEAN_FCL',
                manifestType: 'DIRECT',
                customerId: Number(selectedCustomerId),
                destination: selectedDestination,
                stationScope,
                stationId: stationScope === 'ALL' ? null : Number(selectedStationId),
            }));
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

    const selectedManifestType = watch('loadManifestType');

    useEffect(() => {
        setProReceiptsConfirmed(false);
        if (viewMode || selectedManifestType !== 'Pro Entry Search') return;
        const controller = new AbortController();
        setProOptions([]);
        setProError('');
        setProLoading(false);
        setValue('proNumbers', []);
        setSelectedProNumbers([]);
        setProDetailsOpen(false);
        setDetailReceiptIds([]);
        setDetailProNumbers([]);
        setProSearch('');
        setProFilter('');
        if (!selectedCustomerId || !stationScope || !selectedDestination) return;

        setProLoading(true);
        axios.post('warehouse-receipt/for-shipment', {
            shipmentType: 'OCEAN_FCL',
            manifestType: 'PRO_SEARCH',
            customerId: Number(selectedCustomerId),
            destination: selectedDestination,
            stationScope,
            stationId: stationScope === 'ALL' ? null : Number(selectedStationId),
        }, { signal: controller.signal })
            .then(({ data }) => {
                if (controller.signal.aborted) return;
                if (data?.success === false || !Array.isArray(data?.data)) {
                    throw new Error(data?.message || 'Invalid PRO search response');
                }
                setProOptions(data.data.map((item, index) => ({
                    ...item,
                    id: item.receiptId || item.id || index,
                    proNumber: String(item.proNumber || ''),
                    customer: item.customerName || item.customer || '',
                    station: item.stationName || item.station || '',
                })));
            })
            .catch((error) => {
                if (!controller.signal.aborted) setProError(error?.message || 'Could not load PRO numbers.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setProLoading(false);
            });
        return () => controller.abort();
    }, [viewMode, selectedManifestType, selectedCustomerId, selectedDestination, stationScope, selectedStationId, setValue]);

    const { fields: warehouseFields, append: appendWarehouse, remove: removeWarehouse, replace: replaceWarehouses } = useFieldArray({
        control,
        name: "warehouses"
    });

    useEffect(() => {
        if (!pendingProRowsRef.current) return;
        const unsavedReceiptIds = pendingProRowsRef.current.unsavedReceiptIds;
        pendingProRowsRef.current = false;
        setSavedWarehouseRows(new Set(warehouseFields.filter((item) => !unsavedReceiptIds.includes(String(item.warehouseNo?.receiptId))).map((item) => item.id)));
        setReceiptInputValues(Object.fromEntries(warehouseFields.map((item) => [item.id, getShipmentReceiptOptionLabel(item.warehouseNo)])));
    }, [warehouseFields]);

    const watchedWarehouses = useWatch({ control, name: 'warehouses' });
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

    const handleToggleProNumber = (proNumber) => {
        setSelectedProNumbers((previous) => previous.includes(proNumber)
            ? previous.filter((number) => number !== proNumber)
            : [...previous, proNumber]);
    };

    const uniqueProOptions = [...new Map(proOptions.map((item) => [item.proNumber, item])).values()];
    const detailOptions = proOptions.filter((item) => detailProNumbers.includes(item.proNumber));
    const visibleProOptions = (proDetailsOpen ? detailOptions : uniqueProOptions).filter((item) =>
        (!proFilter || item.proNumber === proFilter) &&
        (!proDetailsOpen || (
            (!destinationFilters.length || destinationFilters.includes(item.destination || '')) &&
            (!warehouseFilter || String(item.receiptNumber) === warehouseFilter) &&
            (!hazmatFilter || getHazmatLabel(item) === hazmatFilter)
        )) &&
        [item.proNumber, item.customer, item.station, item.receiptNumber, item.destination].some((value) =>
            String(value || '').toLowerCase().includes(proSearch.trim().toLowerCase()))
    );

    const openProDetails = () => {
        const numbers = [...selectedProNumbers];
        setDetailProNumbers(numbers);
        const existingRows = proReceiptsConfirmed ? watchedWarehouses : [];
        const existingProNumbers = new Set(existingRows.map((item) => item.warehouseNo?.proNumber));
        const existingReceiptIds = new Set(existingRows.map((item) => String(item.warehouseNo?.receiptId)));
        setDetailReceiptIds(proOptions.filter((item) => numbers.includes(item.proNumber) &&
            (!existingProNumbers.has(item.proNumber) || existingReceiptIds.has(String(item.receiptId))))
            .map((item) => item.id));
        setProFilter('');
        setProSearch('');
        setDestinationFilters([]);
        setWarehouseFilter('');
        setHazmatFilter('');
        setProDetailsOpen(true);
    };

    const renderSelectAllHeader = () => {
        const selectedIds = proDetailsOpen ? detailReceiptIds : selectedProNumbers;
        const setSelectedIds = proDetailsOpen ? setDetailReceiptIds : setSelectedProNumbers;
        const visibleIds = new Set(visibleProOptions.map((item) => proDetailsOpen ? item.id : item.proNumber));
        const selectedCount = selectedIds.filter((id) => visibleIds.has(id)).length;
        return (
            <Checkbox size="small" sx={{ p: 0.5 }}
                disabled={proDetailsOpen || !visibleIds.size}
                checked={visibleIds.size > 0 && selectedCount === visibleIds.size}
                indeterminate={selectedCount > 0 && selectedCount < visibleIds.size}
                onChange={(event) => {
                    const { checked } = event.target;
                    setSelectedIds((previous) => checked
                        ? [...new Set([...previous, ...visibleIds])]
                        : previous.filter((id) => !visibleIds.has(id)));
                }}
                slotProps={{ input: { 'aria-label': proDetailsOpen ? 'Select all filtered receipts' : 'Select all filtered PRO numbers' } }} />
        );
    };

    const detailColumns = [
        {
            field: 'selection', headerName: '', width: 44, sortable: false, filterable: false,
            renderHeader: renderSelectAllHeader,
            renderCell: ({ row }) => <Checkbox size="small" sx={{ p: 0.5 }} disabled
                checked={detailReceiptIds.includes(row.id)}
                slotProps={{ input: { 'aria-label': `Select receipt ${row.receiptNumber}` } }} />,
        },
        { field: 'proNumber', headerName: 'Pro Number', flex: 1, minWidth: 120 },
        { field: 'receiptNumber', headerName: 'Warehouse ID', flex: 1.1, minWidth: 130 },
        { field: 'station', headerName: 'Station', flex: 1.5, minWidth: 160 },
        { field: 'destination', headerName: 'Destination', flex: 1.1, minWidth: 130,
            renderCell: ({ value }) => value || '-' },
        { field: 'hazMat', headerName: 'Haz Mat', flex: 0.7, minWidth: 90,
            valueGetter: (value, row) => getHazmatLabel(row) },
        { field: 'action', headerName: 'Action', flex: 0.6, minWidth: 70, sortable: false, filterable: false,
            renderCell: ({ row }) => <IconButton size="small" aria-label={`View receipt ${row.receiptNumber} in a new tab`}
                component="a" href={`${PATH_DASHBOARD.warehouseReceiptForm}?receiptId=${encodeURIComponent(row.receiptId)}`}
                target="_blank" rel="noopener noreferrer"><Iconify icon="carbon:view" width={16} /></IconButton> },
    ];

    const proColumns = [
        {
            field: 'selection', headerName: '', width: 44, sortable: false, filterable: false,
            renderHeader: renderSelectAllHeader,
            renderCell: ({ row }) => (
                <Checkbox size="small" checked={selectedProNumbers.includes(row.proNumber)}
                    onChange={() => handleToggleProNumber(row.proNumber)}
                    slotProps={{ input: { 'aria-label': `Select PRO number ${row.proNumber}` } }}
                    sx={{ p: 0.5 }} />
            ),
        },
        {
            field: 'proNumber',
            headerName: 'Pro Number',
            width: 120,
            renderCell: (params) => (
                <Button onClick={() => handleToggleProNumber(params.row.proNumber)}
                    sx={{ p: 0, minWidth: 0, color: '#a22', textDecoration: 'underline', fontWeight: 700, fontSize: 12, textTransform: 'none' }}>
                    {params.row.proNumber}
                </Button>
            ),
        },
        { field: 'customer', headerName: 'Customer', width: 240 },
        { field: 'station', headerName: 'Station', width: 180 },
    ];

    const confirmProReceipts = () => {
        const selectedReceipts = detailOptions.filter((item) => detailReceiptIds.includes(item.id));
        Object.values(receiptSearchTimers.current).forEach(clearTimeout);
        const existingRows = proReceiptsConfirmed ? watchedWarehouses : [];
        const existingRowsByReceiptId = new Map(existingRows.map((item) => [String(item.warehouseNo?.receiptId), item]));
        const selectedRows = selectedReceipts.map((receipt) => existingRowsByReceiptId.get(String(receipt.receiptId)) || ({
            warehouseNo: receipt,
            pieces: receipt.piecesInland ?? '',
            weight: receipt.reWeight ?? '',
        }));
        pendingProRowsRef.current = {
            unsavedReceiptIds: proReceiptsConfirmed ? warehouseFields
                .filter((item) => !savedWarehouseRows.has(item.id))
                .map((item) => String(item.warehouseNo?.receiptId)) : [],
        };
        replaceWarehouses(selectedRows);
        setValue('proNumbers', [...new Set(selectedRows.map((item) => item.warehouseNo?.proNumber).filter(Boolean))]);
        setWarehouseReceiptError(false);
        setRowSaveError('');
        setSubmitError('');
        setProReceiptsConfirmed(true);
        setOpenProModal(false);
        setProDetailsOpen(false);
    };

    const onSubmit = async (data) => {
        if (viewMode || submitInFlightRef.current) return;
        setSubmitError('');
        const isProSearch = data.loadManifestType === 'Pro Entry Search';
        if (isProSearch && !proReceiptsConfirmed) {
            setProDetailsOpen(false);
            setProFilter('');
            setOpenProModal(true);
            return;
        }
        if (data.loadManifestType !== 'Direct Entry' && !isProSearch) {
            setSubmitError('Submission is currently available for Direct Entry only.');
            return;
        }
        if (data.loadManifestType === 'Direct Entry' || isProSearch) {
            if (!data.warehouses.some((item) => item.warehouseNo?.receiptId)) {
                setWarehouseReceiptError(true);
                setRowSaveError('At least one Warehouse receipt is required.');
                return;
            }
            if (warehouseFields.some((item) => !savedWarehouseRows.has(item.id))) {
                setRowSaveError('Save all Warehouse rows before submitting.');
                return;
            }
        }
        const formatDate = (value) => value && dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD') : '';
        const payload = {
            shipmentType: 'OCEAN_FCL',
            barcodeNumber: data.rmProNo,
            customerId: Number(data.customer?.customerId || data.customer?.id || 0),
            stationScope: data.station?.stationScope === 'ALL' ? 'ALL' : 'SPECIFIC',
            stationId: data.station?.stationScope === 'ALL' ? null : Number(data.station?.stationId || data.station?.id || 0),
            destination: data.destination,
            consigneeId: Number(data.consignee?.airlineId || data.consignee?.id || 0),
            airBillNumber: '',
            booking: data.booking,
            customerRefNumber: data.customerRefNumber,
            additionalRefNumber: data.additionalRefNumber,
            pieces: totalPieces,
            weight: totalWeight,
            earlyReturnDate: formatDate(data.earlyReturnDate),
            dropByDate: formatDate(data.dropByDate),
            manifestType: isProSearch ? 'PRO_SEARCH' : 'DIRECT',
            startDate: '',
            endDate: '',
            instructions: data.instructions,
            containers: [{ container: String(data.containerNo || '').trim() }],
            receipts: data.warehouses
                .filter((item) => item.warehouseNo?.receiptId)
                .map((item) => ({ receiptId: Number(item.warehouseNo.receiptId) })),
        };

        submitInFlightRef.current = true;
        try {
            const result = await dispatch(postShipment(payload));
            if (result?.success) {
                handleClose();
            } else {
                setSubmitError(result?.error || 'Failed to create shipment');
            }
        } catch (error) {
            setSubmitError(error?.message || 'Failed to create shipment');
        } finally {
            submitInFlightRef.current = false;
        }
    };

    return (
        <ShipmentFormLayout
            title={viewMode ? 'View Ocean FCL Shipment Form' : 'New Ocean FCL Shipment Form'}
            handleClose={handleClose}
            onSubmit={handleSubmit(onSubmit, () => setSubmitError('Please fill all mandatory fields before submitting'))}
            submitLabel={selectedManifestType === 'Pro Entry Search' && !proReceiptsConfirmed ? 'Next' : 'Submit'}
            submitLoading={createShipmentLoading}
            submitLoadingLabel="Submitting..."
            showSubmit={!viewMode}
            readOnly={viewMode}
            stickyHeader
            topInfoPanel={
                <TopInfoPanel 
                    showBarcodeGraphic={false}
                    barcodeValue={barcodeValue}
                    onBarcodeGenerate={() => setBarcodeValue(rmProValue)}
                    rmProInputNode={
                        <Controller
                            name="rmProNo"
                            control={control}
                            rules={{
                                required: 'RM PRO Number is required',
                                validate: (value) => !/\s/.test(value) || 'Spaces are not allowed in RM PRO Number',
                            }}
                            render={({ field, fieldState: { error } }) => (
                                <Box sx={{ bgcolor: '#fff', borderRadius: 0.5 }}>
                                    <StyledTextField
                                        {...field}
                                        onChange={(event) => field.onChange(event.target.value.replace(/\s/g, ''))}
                                        onKeyDown={(event) => {
                                            if (event.key === ' ') event.preventDefault();
                                        }}
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
                {/* --- Customer Details --- */}
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
                                    setStationSearchValue(newValue ? 'All' : '');
                                    setValue('station', newValue ? ALL_STATIONS_OPTION : null, { shouldDirty: true, shouldValidate: true });
                                    setValue('destination', '', { shouldDirty: true });
                                    clearErrors('destination');
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
                                options={[ALL_STATIONS_OPTION, ...stationOptions.filter((option) => getStationOptionLabel(option).toLowerCase() !== 'all')]}
                                filterOptions={(options) => options}
                                value={field.value}
                                inputValue={stationSearchValue}
                                disabled={!selectedCustomerId}
                                loading={stationLoading}
                                getOptionLabel={getStationOptionLabel}
                                isOptionEqualToValue={(option, value) =>
                                    (option?.stationScope === 'ALL' || value?.stationScope === 'ALL')
                                        ? option?.stationScope === value?.stationScope
                                        : String(option?.stationId || option?.id || '') === String(value?.stationId || value?.id || '')
                                }
                                onInputChange={(event, newInputValue, reason) => {
                                    if (reason !== 'reset') setStationSearchValue(newInputValue);
                                }}
                                onChange={(event, newValue) => {
                                    setValue('destination', '', { shouldDirty: true });
                                    clearErrors('destination');
                                    setDestinationRequestVersion((version) => version + 1);
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

                {/* --- Destination Details --- */}
                <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
                    <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Destination Details</Typography></legend>
                    <Controller name="destination" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                        <Autocomplete
                            sx={{ width: { xs: '100%', sm: 'calc((100% - 48px) / 3)' } }}
                            readOnly={viewMode}
                            options={destinationOptions}
                            loading={destinationLoading}
                            disabled={!selectedCustomerId || !stationScope || destinationLoading}
                            loadingText="Loading destinations..."
                            noOptionsText={destinationError || 'No destinations found'}
                            value={field.value || null}
                            onChange={(event, newValue) => field.onChange(newValue || '')}
                            onBlur={field.onBlur}
                            renderInput={(params) => (
                                <StyledTextField
                                    {...params}
                                    inputRef={field.ref}
                                    name={field.name}
                                    variant="standard"
                                    label="Select Destination"
                                    required
                                    error={!!error || !!destinationError}
                                    helperText={destinationError || error?.message}
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {destinationLoading ? <CircularProgress color="inherit" size={18} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                        />
                    )} />
                </fieldset>

                {/* --- Booking Details --- */}
                <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
                    <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Booking Details</Typography></legend>
                    <Stack spacing={3}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                            <Controller name="booking" control={control} render={({ field }) => (
                                <StyledTextField {...field} variant="standard" fullWidth label="Booking" />
                            )} />
                            <Controller name="customerRefNumber" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                                <StyledTextField {...field} variant="standard" fullWidth label="Customer Ref Number *" error={!!error} />
                            )} />
                            <Controller name="additionalRefNumber" control={control} render={({ field }) => (
                                <StyledTextField {...field} variant="standard" fullWidth label="Additional Ref Number" />
                            )} />
                            <Box sx={{ width: '100%' }} /> 
                        </Stack>
                        
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                                <Controller name="earlyReturnDate" control={control} render={({ field: { onChange, value } }) => (
                                    <DatePicker label="Early Return Date" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />
                                )} />
                                <Controller name="dropByDate" control={control} render={({ field: { onChange, value } }) => (
                                    <DatePicker label="Drop by Date" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />
                                )} />
                                <Box sx={{ width: '100%' }} /> 
                            </Stack>
                        </LocalizationProvider>
                    </Stack>
                </fieldset>

                {/* --- Mid Section --- */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} alignItems="flex-start">
                    <Box sx={{ width: '25%' }}>
                        <Controller name="containerNo" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Container No *" error={!!error} sx={{ mt: 1.5 }} />
                        )} />
                    </Box>
                    
                    <Box sx={{ width: '45%' }}>
                        <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '12px' }}>
                            <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Instructions</Typography></legend>
                            <Controller name="instructions" control={control} render={({ field }) => (
                                <StyledTextField {...field} variant="standard" fullWidth multiline InputProps={{ disableUnderline: true }} sx={{ '& .MuiInputBase-root': { padding: 0 } }} />
                            )} />
                        </fieldset>
                    </Box>

                    <Box sx={{ width: '30%' }}>
                        <Controller name="loadManifestType" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <StyledTextField select {...field} variant="standard" fullWidth label="Select Load Manifest Type *" error={!!error} sx={{ mt: 1.5 }}>
                                <MenuItem value="Direct Entry">Direct Entry</MenuItem>
                                <MenuItem value="Pro Entry Search">Pro Entry Search</MenuItem>
                                <MenuItem value="FromToDateSelection">From & To Date Selection</MenuItem>
                            </StyledTextField>
                        )} />
                    </Box>
                </Stack>

                {/* --- Bottom Dynamic Section based on Manifest Type --- */}

                {/* 1. Show Warehouse Table if 'Direct Entry' */}
                {(selectedManifestType === 'Direct Entry' || (selectedManifestType === 'Pro Entry Search' && proReceiptsConfirmed)) && (
                    <Grid container spacing={4}>
                        <Grid size={{ xs: 12 }}>
                            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflowX: 'auto', '& > .MuiStack-root': { minWidth: 800 } }}>
                                <Stack direction="row" sx={{ bgcolor: '#dbdbdb', p: 1 }}>
                                    <Typography sx={{ width: '6%', fontWeight: 600, fontSize: '13px', pl: 1 }}>Sno</Typography>
                                    <Typography sx={{ width: '28%', fontWeight: 600, fontSize: '13px' }}>Warehouse #</Typography>
                                    <Typography sx={{ width: '12%', fontWeight: 600, fontSize: '13px' }}>Destination</Typography>
                                    <Typography sx={{ width: '10%', fontWeight: 600, fontSize: '13px' }}>Pieces</Typography>
                                    <Typography sx={{ width: '12%', fontWeight: 600, fontSize: '13px' }}>Weight (lbs)</Typography>
                                    <Typography sx={{ width: '8%', fontWeight: 600, fontSize: '13px' }}>Items</Typography>
                                    <Typography sx={{ width: '12%', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>Status</Typography>
                                    <Typography sx={{ width: '12%', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>Actions</Typography>
                                </Stack>
                                {warehouseFields.map((item, index) => (
                                    <Stack direction="row" alignItems="center" sx={{ p: 1, borderBottom: '1px solid #f0f0f0' }} key={item.id}>
                                        <Box sx={{ width: '6%', pl: 1 }}>
                                            <Typography sx={{ fontSize: '13px', color: '#555' }}>
                                                {String(index + 1).padStart(2, '0')}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ width: '28%', pr: 1 }}>
                                            <Controller name={`warehouses.${index}.warehouseNo`} control={control} render={({ field }) => (
                                                <Autocomplete
                                                    fullWidth
                                                    size="small"
                                                    options={canSelectWarehouse ? shipmentReceiptOptionsByField[item.id] || [] : []}
                                                    value={field.value}
                                                    inputValue={viewMode ? getShipmentReceiptOptionLabel(field.value) : receiptInputValues[item.id] || ''}
                                                    readOnly={viewMode || !canSelectWarehouse}
                                                    openOnFocus={!viewMode && canSelectWarehouse}
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
                                        <Box sx={{ width: '12%', pr: 1, minWidth: 0 }}>
                                            <Typography sx={{ fontSize: '13px', overflowWrap: 'anywhere' }}>
                                                {(viewMode && rowData?.destination)
                                                    || watchedWarehouses[index]?.warehouseNo?.destination
                                                    || watchedWarehouses[index]?.warehouseNo?.finalDestination
                                                    || ''}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ width: '10%', pr: 1 }}>
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
                                        <Box sx={{ width: '12%', pr: 1 }}>
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
                                        <Box sx={{ width: '8%', pr: 1 }}>
                                            <Box
                                                component="span"
                                                sx={{ px: 0.5, py: 0.25, borderRadius: 0.5, fontWeight: 700, ...statusStyles[getReceiptStatus(watchedWarehouses[index]?.warehouseNo)] }}
                                            >
                                                {Number(watchedWarehouses[index]?.warehouseNo?.freightSummary?.scanned || 0)}/
                                                {Number(watchedWarehouses[index]?.warehouseNo?.freightSummary?.total || watchedWarehouses[index]?.warehouseNo?.piecesInland || 0)}
                                            </Box>
                                        </Box>
                                        <Box sx={{ width: '12%', pr: 1, textAlign: 'center' }}>
                                            <Box
                                                component="span"
                                                sx={{ display: 'inline-block', minWidth: 72, px: 1, py: 0.25, borderRadius: 5, textAlign: 'center', fontSize: 11, ...statusStyles[getReceiptStatus(watchedWarehouses[index]?.warehouseNo)] }}
                                            >
                                                {getReceiptStatus(watchedWarehouses[index]?.warehouseNo)}
                                            </Box>
                                        </Box>
                                        <Box sx={{ width: '12%', display: 'flex', justifyContent: 'center', gap: 0.25 }}>
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
                                        disabled={selectedManifestType !== 'Pro Entry Search' && warehouseFields.length > 0 && !savedWarehouseRows.has(warehouseFields[warehouseFields.length - 1]?.id)}
                                        onClick={() => {
                                            if (selectedManifestType === 'Pro Entry Search') {
                                                const existingReceiptIds = new Set(watchedWarehouses.map((item) => String(item.warehouseNo?.receiptId)));
                                                const selectedIds = proOptions.filter((item) => existingReceiptIds.has(String(item.receiptId))).map((item) => item.id);
                                                setSelectedProNumbers([...new Set(watchedWarehouses.map((item) => item.warehouseNo?.proNumber).filter(Boolean))]);
                                                setDetailReceiptIds(selectedIds);
                                                setDetailProNumbers([]);
                                                setProDetailsOpen(false);
                                                setProFilter('');
                                                setProSearch('');
                                                setOpenProModal(true);
                                            } else {
                                                appendWarehouse({ warehouseNo: null, pieces: '', weight: '' });
                                            }
                                        }}
                                        sx={{ bgcolor: '#A22', color: '#fff', borderRadius: '4px', p: '3px', '&:hover': { bgcolor: '#8b1c1c' }, '&.Mui-disabled': { bgcolor: '#ddd' } }}
                                    >
                                        <Iconify icon="akar-icons:plus" width={16} />
                                    </IconButton>
                                </Box>

                                <Stack direction="row" alignItems="center" sx={{ p: 1, borderTop: '2px solid #e0e0e0', mt: 1 }}>
                                    <Box sx={{ width: '6%' }} />
                                    <Box sx={{ width: '28%' }} />
                                    <Box sx={{ width: '12%' }} />
                                    <Box sx={{ width: '10%' }}>
                                        <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>{totalPieces}</Typography>
                                    </Box>
                                    <Box sx={{ width: '12%' }}>
                                        <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>{totalWeight}</Typography>
                                    </Box>
                                    <Box sx={{ width: '12%' }} />
                                    <Box sx={{ width: '12%' }} />
                                    <Box sx={{ width: '8%' }} />
                                </Stack>
                            </Box>
                        </Grid>
                    </Grid>
                )}

                {/* 3. Show Date Selection Section if 'FromToDateSelection' */}
                {selectedManifestType === 'FromToDateSelection' && (
                    <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px', maxWidth: '600px' }}>
                        <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Date Selection</Typography></legend>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                                <Controller name="fromDate" control={control} render={({ field: { onChange, value } }) => (
                                    <DatePicker label="From Date" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />
                                )} />
                                <Controller name="toDate" control={control} render={({ field: { onChange, value } }) => (
                                    <DatePicker label="To Date" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />
                                )} />
                            </Stack>
                        </LocalizationProvider>
                    </fieldset>
                )}

            </Stack>

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
                    Please select Customer, Station, and Destination before selecting a Warehouse receipt.
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

            {/* --- Dialog / Modal for Pro Entry Search --- */}
            <Dialog open={openProModal} onClose={() => { if (!createShipmentLoading) setOpenProModal(false); }} maxWidth="lg" fullWidth
                PaperProps={{ sx: { borderRadius: 1, height: '85vh' } }}>
                <DialogTitle sx={{ px: 2.5, pt: 2, pb: 1, position: 'relative' }}>
                    <IconButton
                        aria-label="Close Pro Number List"
                        size="small"
                        disabled={createShipmentLoading}
                        onClick={() => setOpenProModal(false)}
                        sx={{ position: 'absolute', right: 12, top: 10 }}
                    >
                        <Iconify icon="eva:close-fill" width={20} />
                    </IconButton>
                    <Typography component="span" sx={{ display: 'block', pr: 4, fontSize: 13, fontWeight: 500 }}>
                        Pro Number List - {[getCustomerOptionLabel(selectedCustomer), selectedDestination].filter(Boolean).join(' - ')}
                    </Typography>
                    <Box sx={{ height: '1px', bgcolor: '#999', mt: 0.5 }} />
                </DialogTitle>
                <DialogContent sx={{ px: 2.5, py: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <TextField select variant="standard" label="PRO No" value={proFilter}
                            onChange={(event) => setProFilter(event.target.value)}
                            slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} sx={{ width: 125 }}>
                            <MenuItem value="">All</MenuItem>
                            {[...new Set((proDetailsOpen ? detailOptions : proOptions).map((item) => item.proNumber))].filter(Boolean).map((proNumber) => (
                                <MenuItem key={proNumber} value={proNumber}>{proNumber}</MenuItem>
                            ))}
                        </TextField>
                        {proDetailsOpen && <>
                            <TextField select variant="standard" label="Destination" value={destinationFilters}
                                onChange={(event) => setDestinationFilters(event.target.value.includes('__all') ? [] : event.target.value)}
                                slotProps={{ inputLabel: { shrink: true }, select: { multiple: true, displayEmpty: true,
                                    renderValue: (values) => values.length ? values.map((value) => value || 'Blank').join(', ') : 'All' } }} sx={{ width: 130 }}>
                                <MenuItem value="__all"><Checkbox size="small" checked={!destinationFilters.length} />All</MenuItem>
                                {[...new Set(detailOptions.map((item) => item.destination || ''))].map((value) => (
                                    <MenuItem key={value} value={value}><Checkbox size="small" checked={destinationFilters.includes(value)} />{value || 'Blank'}</MenuItem>
                                ))}
                            </TextField>
                            <TextField select variant="standard" label="Warehouse ID" value={warehouseFilter}
                                onChange={(event) => setWarehouseFilter(event.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 125 }}>
                                <MenuItem value="">All</MenuItem>
                                {[...new Set(detailOptions.map((item) => String(item.receiptNumber)))].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                            </TextField>
                            <TextField select variant="standard" label="Haz Mat" value={hazmatFilter}
                                onChange={(event) => setHazmatFilter(event.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 125 }}>
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="Yes">Hazmat Only</MenuItem>
                                <MenuItem value="No">No Hazmat</MenuItem>
                            </TextField>
                        </>}
                        <TextField size="small" placeholder="Search..." value={proSearch}
                            onChange={(event) => setProSearch(event.target.value)}
                            slotProps={{
                                htmlInput: { 'aria-label': 'Search PRO numbers, customers, or stations' },
                                input: { endAdornment: <InputAdornment position="end"><Iconify icon="eva:search-outline" width={16} /></InputAdornment> },
                            }}
                            sx={{ width: { xs: '100%', sm: 300 }, '& .MuiInputBase-input': { py: 0.5, fontSize: 12 } }} />
                    </Stack>
                    {proError && <Alert severity="error" sx={{ mb: 2 }}>{proError}</Alert>}
                    {proDetailsOpen && submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
                    <Box sx={{ border: '1px solid #ddd', borderRadius: 0.5, overflow: 'hidden', flex: 1, minHeight: 180 }}>
                        <DataGrid
                            key={proDetailsOpen ? 'pro-details' : 'pro-list'}
                            rows={visibleProOptions}
                            loading={proLoading}
                            columns={proDetailsOpen ? detailColumns : proColumns}
                            getRowId={(row) => row.id}
                            rowHeight={28}
                            columnHeaderHeight={32}
                            disableColumnMenu
                            disableRowSelectionOnClick
                            pagination
                            initialState={{ pagination: { paginationModel: { pageSize: 20, page: 0 } } }}
                            pageSizeOptions={[20, 50, 100]}
                            sx={{
                                border: 'none',
                                fontSize: 12,
                                '& .MuiDataGrid-columnHeader': { backgroundColor: '#f5f5f5' },
                                '& .MuiDataGrid-cell': { borderBottom: 'none', display: 'flex', alignItems: 'center' },
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2, pt: 1 }}>
                    {proDetailsOpen && <Button variant="outlined" size="small" disabled={createShipmentLoading}
                        onClick={() => { setProDetailsOpen(false); setProFilter(''); setProSearch(''); }}
                        sx={{ color: '#333', borderColor: '#999', fontSize: 11, textTransform: 'none', py: 0.25 }}>Back</Button>}
                    <Button variant="contained" size="small"
                        onClick={proDetailsOpen ? confirmProReceipts : openProDetails}
                        disabled={proLoading || createShipmentLoading || (!proReceiptsConfirmed && !(proDetailsOpen ? detailReceiptIds.length : selectedProNumbers.length))}
                        sx={{ bgcolor: '#a22', minWidth: 60, fontSize: 11, textTransform: 'none', py: 0.25, '&:hover': { bgcolor: '#8b1c1c' } }}>
                        {proDetailsOpen ? (createShipmentLoading ? 'Confirming...' : 'Confirm') : 'Next'}
                    </Button>
                </DialogActions>
            </Dialog>



        </ShipmentFormLayout>
    );
}
