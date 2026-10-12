import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import {
    Alert, Box, Divider, Tabs, Tab, IconButton, Dialog, DialogContent, Checkbox,
    CircularProgress, FormControlLabel, Snackbar, Button, DialogTitle, DialogActions, DialogContentText, TextField
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { ErrorBoundary } from 'react-error-boundary';
import { useReactToPrint } from 'react-to-print';
import { useDispatch, useSelector } from '../../redux/store';
import { cancelShipment, getShipmentById, getShipmentData, getShipmentForPickup, updateShipmentPickupEntryNumber } from '../../redux/slices/shipment';

import ErrorFallback from '../../../../../RM-Trucking/frontend/src/sections/shared/ErrorBoundary';
import Iconify from '../../components/iconify';
import ShipmentPrintTemplate from './ShipmentPrintTemplate';
import ShipmentScanStatus from './ShipmentScanStatus';
import AirPickupEntryForm from './AirPickupEntryForm';
import FCLPickupEntryForm from './FCLPickupEntryForm';

// ----------------------------------------------------------------------

ShipmentTabs.propTypes = {
    onViewShipment: PropTypes.func.isRequired,
    filters: PropTypes.object,
    onShipmentTypeChange: PropTypes.func,
    initialShipmentType: PropTypes.oneOf(['AIR', 'OCEAN_LCL', 'OCEAN_FCL']),
};

function ScanActionIcon({ width = 20 }) {
    return (
        <Box
            component="svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
            sx={{ width, height: width, display: 'block' }}
        >
            <path
                d="M5 7V4h14v3M3 12h18M5 17v3h14v-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="square"
                strokeLinejoin="miter"
            />
        </Box>
    );
}

ScanActionIcon.propTypes = {
    width: PropTypes.number,
};

export default function ShipmentTabs({ onViewShipment, filters = {}, onShipmentTypeChange, initialShipmentType = 'AIR' }) {
    const dispatch = useDispatch();
    const {
        shipmentData: apiShipmentData,
        isLoading,
        pagination,
        countList,
        shipmentSearchStr,
    } = useSelector((state) => state.shipmentdata);
    
    const [currentTab, setCurrentTab] = useState(() => (
        { AIR: 'active', OCEAN_LCL: 'inactive', OCEAN_FCL: 'incomplete' }[initialShipmentType] || 'active'
    ));
    const [airStatusFilters, setAirStatusFilters] = useState([]);
    const requestFilterEnabled = airStatusFilters.includes('request');
    const canceledFilterEnabled = airStatusFilters.includes('canceled');
    const scannedFilterEnabled = airStatusFilters.includes('scan');
    const pickupFilterEnabled = airStatusFilters.includes('pickup');
    const shippedFilterEnabled = airStatusFilters.includes('shipment');
    // const [selectedRowData, setSelectedRowData] = useState(null);
    // const [openPickupFormType, setOpenPickupFormType] = useState(null);
    const [activeForm, setActiveForm] = useState({ type: null, data: null });
    const printRef = useRef();
    const [printData, setPrintData] = useState(null);
    const [printLoadingId, setPrintLoadingId] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [comingSoonMessage, setComingSoonMessage] = useState('');
    const [pickupError, setPickupError] = useState('');
    const [pickupLoadingId, setPickupLoadingId] = useState(null);
    const [viewLoadingId, setViewLoadingId] = useState(null);
    const [cancelShipmentId, setCancelShipmentId] = useState(null);
    const [cancelRmNumber, setCancelRmNumber] = useState('');
    const [cancelLoading, setCancelLoading] = useState(false);
    const [cancelError, setCancelError] = useState('');
    const cancelPendingRef = useRef(false);
    const [pickupNumberConfirmation, setPickupNumberConfirmation] = useState(null);
    const [pickupNumberEdit, setPickupNumberEdit] = useState(null);
    const [pickupNumberSaving, setPickupNumberSaving] = useState(false);
    const pickupNumberPendingRef = useRef(false);
    
    const shipmentTypeMap = { active: 'AIR', inactive: 'OCEAN_LCL', incomplete: 'OCEAN_FCL' };
    const shipmentData = apiShipmentData
        .map((shipment) => ({
            ...shipment,
            rmNumber: shipment.barcodeNumber,
            customer: shipment.customerName || shipment.customerId,
            station: currentTab === 'incomplete' && shipment.stationName == null
                ? 'All'
                : shipment.stationName || shipment.stationId,
            billNumber: shipment.airBillNumber || shipment.booking || '',
            pickupNumber: shipment.pickupEntryNumber || '',
            scanStatus: shipment.isScanned === 'Y',
            shipmentStatus: shipment.isShipped === 'Y',
            pickupStatus: shipment.pickupEntry === 'Y',
            ofdStatus: shipment.isOfd === 'Y',
            podStatus: shipment.isPod === 'Y',
        }));

    // Local state for the DataGrid pagination model
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 10,
    });
    const shipmentSearchStrRef = useRef(shipmentSearchStr);
    useEffect(() => {
        shipmentSearchStrRef.current = shipmentSearchStr;
    }, [shipmentSearchStr]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        onAfterPrint: () => setPrintData(null),
    });

    const onPrintClick = async (rowData) => {
        const shipmentId = rowData?.shipmentId || rowData?.id;
        if (!shipmentId) {
            setPickupError('Shipment ID is unavailable.');
            return;
        }

        setPrintLoadingId(shipmentId);
        const result = await dispatch(getShipmentById(shipmentId));
        setPrintLoadingId(null);
        if (!result?.success) {
            setPickupError(result?.error || 'Failed to load shipment details for printing.');
            return;
        }

        // flushSync forces React to synchronously commit the DOM update before
        // handlePrint() reads the ref — fixes first-click issue after reload.
        flushSync(() => setPrintData(result.data));
        handlePrint();
    };

    const TABS = [
        { value: 'active', label: 'Air Form', countKey: 'air' },
        { value: 'inactive', label: 'LCL Form', countKey: 'lcl' },
        { value: 'incomplete', label: 'FCL Form', countKey: 'fcl' },
    ];

    // Error boundary info
    const logError = (error, info) => {
        console.error("Error caught:", info);
        console.log(error);
    };

    const OnTabChange = (newValue) => {
        setCurrentTab(newValue);
        onShipmentTypeChange?.(shipmentTypeMap[newValue]);
    };

    const handleAction = async (rowData) => {
        const shipmentId = rowData?.shipmentId || rowData?.id;
        if (!shipmentId) {
            setPickupError('Shipment ID is unavailable.');
            return;
        }

        setViewLoadingId(shipmentId);
        const result = await dispatch(getShipmentById(shipmentId));
        setViewLoadingId(null);

        if (!result?.success) {
            setPickupError(result?.error || 'Failed to load shipment details.');
            return;
        }

        onViewShipment({
            ...result.data,
            shipmentId: result.data?.shipmentId || shipmentId,
        });
    };

    const handleHandExtended = (rowData) => {
        setActiveForm({ type: 'scanStatus', data: rowData });
    };

const handleClosePickupForm = () => {
    setActiveForm({ type: null, data: null });
};

    const handleCompleteSuccess = (message = 'Request submitted successfully') => {
        handleClosePickupForm();
        setSuccessMessage(message);
        dispatch(getShipmentData({
            pageNo: paginationModel.page + 1,
            pageSize: paginationModel.pageSize,
            searchTerm: shipmentSearchStrRef.current,
            ...filters,
            request: requestFilterEnabled || filters.request,
            canceled: canceledFilterEnabled || filters.canceled,
            scanned: scannedFilterEnabled || filters.scanned,
            pickup: pickupFilterEnabled || filters.pickup,
            shipped: shippedFilterEnabled || filters.shipped,
            shipmentType: shipmentTypeMap[currentTab],
        }));
    };

    const handleSavePickupNumber = async () => {
        if (!pickupNumberEdit || pickupNumberPendingRef.current) return;
        pickupNumberPendingRef.current = true;
        setPickupNumberSaving(true);
        try {
            const result = await dispatch(updateShipmentPickupEntryNumber({
                shipmentId: pickupNumberEdit.shipmentId,
                pickupEntryNumber: pickupNumberEdit.value,
            }));
            if (!result?.success) {
                setPickupError(result?.error || 'Failed to save pickup number.');
                return;
            }
            setPickupNumberEdit(null);
            handleCompleteSuccess(result.message || 'Pickup number saved successfully.');
        } finally {
            pickupNumberPendingRef.current = false;
            setPickupNumberSaving(false);
        }
    };

    const handleCloseCancelDialog = () => {
        if (cancelPendingRef.current) return;
        setCancelShipmentId(null);
        setCancelError('');
    };

    const handleConfirmCancel = async () => {
        if (cancelPendingRef.current || cancelShipmentId === null) return;
        cancelPendingRef.current = true;
        setCancelLoading(true);
        setCancelError('');
        try {
            const result = await dispatch(cancelShipment(cancelShipmentId));
            if (!result?.success) {
                setCancelError(result?.error || 'Failed to cancel shipment.');
                return;
            }
            setCancelShipmentId(null);
            handleCompleteSuccess(result.message || 'Shipment canceled successfully.');
        } finally {
            cancelPendingRef.current = false;
            setCancelLoading(false);
        }
    };

    const handleFileDocumentBox = async (rowData) => {
        if (currentTab === 'incomplete' || ['OCEAN_FCL', 'FCL'].includes(rowData?.shipmentType)) return;
        const shipmentId = rowData?.shipmentId || rowData?.id;
        if (!shipmentId) {
            setPickupError('Shipment ID is unavailable.');
            return;
        }

        setPickupLoadingId(shipmentId);
        const result = await dispatch(getShipmentForPickup(shipmentId));
        setPickupLoadingId(null);

        if (!result?.success) {
            setPickupError(result?.error || 'Failed to load pickup details.');
            return;
        }

        setActiveForm({
            type: ['OCEAN_FCL', 'FCL'].includes(rowData.shipmentType || result.data?.shipmentType)
                ? 'fclPickup'
                : 'airPickup',
            data: {
                ...rowData,
                ...result.data,
                shipmentId: result.data?.shipmentId || shipmentId,
            },
        });
    };

    // Fetch the current server-side page.
    useEffect(() => {
        dispatch(getShipmentData({
            pageNo: paginationModel.page + 1,
            pageSize: paginationModel.pageSize,
            searchTerm: shipmentSearchStrRef.current,
            ...filters,
            request: requestFilterEnabled || filters.request,
            canceled: canceledFilterEnabled || filters.canceled,
            scanned: scannedFilterEnabled || filters.scanned,
            pickup: pickupFilterEnabled || filters.pickup,
            shipped: shippedFilterEnabled || filters.shipped,
            shipmentType: shipmentTypeMap[currentTab],
        }));
    }, [
        dispatch,
        paginationModel.page,
        paginationModel.pageSize,
        filters,
        currentTab,
        pickupFilterEnabled,
        requestFilterEnabled,
        canceledFilterEnabled,
        scannedFilterEnabled,
        shippedFilterEnabled,
    ]);

    useEffect(() => {
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
    }, [currentTab]);

    // 2. Sync DataGrid pagination model with Redux pagination state
    useEffect(() => {
        if (!pagination) return;

        const nextPage = pagination.page ? parseInt(pagination.page, 10) - 1 : 0;
        const nextPageSize = pagination.pageSize || 10;

        setPaginationModel((prev) => {
            if (prev.page === nextPage && prev.pageSize === nextPageSize) {
                return prev;
            }
            return { page: nextPage, pageSize: nextPageSize };
        });
    }, [pagination?.page, pagination?.pageSize]);

    const statusOptions = [
        { value: 'scan', label: 'Scan', header: 'Scan Status' },
        { value: 'shipment', label: 'Shipment', header: 'Shipment Status' },
        { value: 'pickup', label: 'Pickup', header: 'Pickup Status' },
        { value: 'ofd', label: 'OFD', header: 'OFD Status' },
        { value: 'pod', label: 'POD', header: 'POD Status' },
    ];
    const statusFilterOptions = [
        ...statusOptions,
        { value: 'request', label: 'Request' },
        { value: 'canceled', label: 'Canceled' },
    ];

    const handleStatusFilterChange = (value) => {
        setAirStatusFilters((current) => current.includes(value) ? [] : [value]);
        if (['request', 'canceled', 'scan', 'pickup', 'shipment'].includes(value)) {
            setPaginationModel((current) => ({ ...current, page: 0 }));
        }
    };
    const renderStatus = (complete) => (
        <Iconify
            icon={complete ? 'eva:checkmark-circle-2-fill' : 'mdi:clock'}
            width={18}
            sx={{ color: complete ? '#54ad72' : '#e5ae00' }}
        />
    );

    // Define DataGrid columns
    const baseColumns = [
        {
            field: 'rmNumber',
            headerName: 'RM Number',
            flex: 1,
            minWidth: 150,
            headerAlign: 'left',
        },
        {
            field: 'customer',
            headerName: 'Customer',
            flex: 1,
            minWidth: 150,
            headerAlign: 'left',
        },
        {
            field: 'station',
            headerName: 'Station',
            flex: 1,
            minWidth: 150,
            headerAlign: 'left',
        },
        {
            field: 'billNumber',
            headerName: currentTab === 'incomplete' ? 'Bill Number' : 'Air Bill No',
            flex: 1,
            minWidth: 150,
            headerAlign: 'left',
        },
    ];

    const airStatusColumns = statusOptions
        .map((status) => ({
            field: `${status.value}Status`,
            headerName: status.header,
            minWidth: 130,
            flex: 0.8,
            align: 'center',
            headerAlign: 'center',
            sortable: true,
            renderCell: (params) => params.row.isCanceled === 'Y' && ['scan', 'shipment', 'pickup'].includes(status.value)
                ? <Iconify icon="mdi:cancel" width={18} sx={{ color: '#A22' }} aria-label="Canceled" />
                : renderStatus(Boolean(params.value)),
        }));

    const pickupNumberColumn = {
        field: 'pickupNumber',
        headerName: 'Pickup No',
        minWidth: 190,
        flex: 0.8,
        renderCell: (params) => params.row.pickupStatus && params.row.isCanceled !== 'Y'
            ? pickupNumberEdit?.shipmentId === params.row.shipmentId ? (
            <Box
                sx={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%' }}
                onMouseDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
            >
                <TextField
                    autoFocus
                    size="small"
                    value={pickupNumberEdit.value}
                    onChange={(event) => setPickupNumberEdit((current) => ({ ...current, value: event.target.value }))}
                    disabled={pickupNumberSaving}
                    slotProps={{ htmlInput: { 'aria-label': 'Pickup No' } }}
                    sx={{ flex: 1, minWidth: 0 }}
                />
                <IconButton size="small" aria-label="Save pickup number" disabled={pickupNumberSaving} onClick={handleSavePickupNumber} sx={{ color: '#54ad72' }}>
                    {pickupNumberSaving ? <CircularProgress size={18} color="inherit" /> : <Iconify icon="mdi:check" width={18} />}
                </IconButton>
                <IconButton size="small" aria-label="Cancel pickup number edit" disabled={pickupNumberSaving} onClick={() => setPickupNumberEdit(null)} sx={{ color: '#A22' }}>
                    <Iconify icon="mdi:close" width={18} />
                </IconButton>
            </Box>
        ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: '100%', width: '100%' }}>
                <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{params.value}</Box>
                <IconButton
                    size="small"
                    aria-label="Edit pickup number"
                    title="Edit Pickup No"
                    disabled={Boolean(pickupNumberEdit) || pickupNumberSaving}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        if (pickupNumberPendingRef.current) return;
                        setPickupNumberConfirmation({ shipmentId: params.row.shipmentId, value: String(params.value ?? '') });
                    }}
                    sx={{ color: '#A22' }}
                >
                    <Iconify icon="mdi:pencil" width={16} />
                </IconButton>
            </Box>
        ) : params.value,
    };

    const actionColumn = {
            field: 'action',
            headerName: 'Action',
            width: 180,
            minWidth: 180,
            headerAlign: 'center',
            align: 'center',
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            headerClassName: 'sticky-action-header',
            cellClassName: 'sticky-action-cell',
            renderCell: (params) => {
                return (
                    <Box
                        onMouseDown={(event) => event.stopPropagation()}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                        }}
                    >
                        <IconButton
                            size="small"
                            disabled={viewLoadingId !== null}
                            onClick={(e) => { e.stopPropagation(); handleAction(params.row); }}
                            sx={{ color: '#A22' }}
                        >
                            {String(viewLoadingId) === String(params.row.shipmentId || params.row.id) ? (
                                <CircularProgress size={18} color="inherit" />
                            ) : (
                                <Iconify icon="eva:eye-fill" width={20} />
                            )}
                        </IconButton>
                        <IconButton
                            size="small"
                            disabled={printLoadingId !== null}
                            onClick={(e) => { e.stopPropagation(); onPrintClick(params.row); }}
                            sx={{ color: '#A22' }}
                        >
                            {String(printLoadingId) === String(params.row.shipmentId || params.row.id) ? (
                                <CircularProgress size={18} color="inherit" />
                            ) : (
                                <Iconify icon="mdi:printer" width={20} />
                            )}
                        </IconButton>
                        <IconButton
                            size="small"
                            disabled={params.row.isCanceled === 'Y' || params.row.pickupEntry === 'Y' || (params.row.isShipped === 'Y'
                                && (['inactive', 'incomplete'].includes(currentTab) || ['OCEAN_LCL', 'LCL', 'OCEAN_FCL', 'FCL'].includes(params.row.shipmentType) || pickupLoadingId !== null))}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (params.row.pickupEntry === 'Y') return;
                                if (params.row.isShipped !== 'Y') {
                                    handleHandExtended(params.row);
                                } else {
                                    handleFileDocumentBox(params.row);
                                }
                            }}
                            sx={{ color: '#A22' }}
                        >
                            {String(pickupLoadingId) === String(params.row.shipmentId || params.row.id) ? (
                                <CircularProgress size={18} color="inherit" />
                            ) : params.row.isShipped !== 'Y' ? (
                                <ScanActionIcon width={20} />
                            ) : params.row.pickupEntry === 'Y' ? (
                                <Iconify icon="mdi:truck-delivery" width={20} />
                            ) : (
                                <Iconify icon="mdi:file-document-box" width={20} />
                            )}
                        </IconButton>
                        <IconButton
                            size="small"
                            aria-label="Cancel shipment"
                            title="Cancel shipment"
                            disabled={params.row.isCanceled === 'Y' || cancelLoading}
                            onClick={(event) => {
                                event.stopPropagation();
                                const shipmentId = params.row.shipmentId || params.row.id;
                                if (!shipmentId) {
                                    setPickupError('Shipment ID is unavailable.');
                                    return;
                                }
                                setCancelError('');
                                setCancelRmNumber(params.row.rmNumber || '');
                                setCancelShipmentId(shipmentId);
                            }}
                            sx={{ color: '#A22' }}
                        >
                            <Iconify icon="mdi:cancel" width={20} />
                        </IconButton>
                    </Box>
                );
            },
        };

    const airColumns = [...baseColumns, ...airStatusColumns, pickupNumberColumn, actionColumn];
    const destinationColumn = {
        field: 'destination',
        headerName: 'Destination',
        flex: 1,
        minWidth: 150,
        headerAlign: 'left',
    };
    const columns = currentTab === 'incomplete'
        ? airColumns
            .filter((column) => column.field !== 'billNumber')
            .flatMap((column) => column.field === 'station' ? [column, destinationColumn] : [column])
        : currentTab === 'inactive'
            ? airColumns.filter((column) => column.field !== 'billNumber')
            : airColumns;

    return (
        <>
            <ErrorBoundary
                FallbackComponent={ErrorFallback}
                onError={logError}
                onReset={() => console.log("Error boundary reset triggered")}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mt: 2,
                    }}>
                    <Tabs
                        value={currentTab}
                        onChange={(event, newValue) => OnTabChange(newValue)}
                        sx={{
                            '& .MuiTabs-flexContainer': {
                                display: 'flex',
                                alignItems: 'center',
                            },
                            '& .MuiTabs-indicator': {
                                backgroundColor: '#A22',
                                height: 2
                            },
                        }}
                    >
                        {TABS.map((tab) => (
                            <Tab
                                key={tab.value}
                                value={tab.value}
                                label={`${tab.label} (${countList?.[tab.countKey] ?? 0})`}
                                aria-disabled={tab.comingSoon || undefined}
                                onClick={() => {
                                    if (tab.comingSoon) setComingSoonMessage(`${tab.label} will be available soon.`);
                                }}
                                sx={{
                                    '&.Mui-selected': {
                                        color: '#A22',
                                        fontWeight: '600',
                                    },
                                    color: 'black',
                                    ...(tab.comingSoon && { opacity: 0.5, cursor: 'not-allowed' }),
                                }}
                            />
                        ))}
                    </Tabs>
                </Box>
                <Divider sx={{ borderColor: 'rgba(143, 143, 143, 1)', mb: 2 }} />

                {['active', 'inactive', 'incomplete'].includes(currentTab) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {statusFilterOptions.map((status) => (
                            <FormControlLabel
                                key={status.value}
                                label={status.label}
                                control={(
                                    <Checkbox
                                        size="small"
                                        checked={airStatusFilters.includes(status.value)}
                                        onChange={() => handleStatusFilterChange(status.value)}
                                        sx={{ color: '#8a8a8a', '&.Mui-checked': { color: '#173b70' } }}
                                    />
                                )}
                                sx={{ mr: 1, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
                            />
                        ))}
                    </Box>
                )}

                <Box sx={{ width: "100%", flex: 1 }}>
                    <DataGrid
                        rows={shipmentData}
                        columns={columns}
                        loading={isLoading}
                        getRowId={(row) => row.shipmentId}
                        onCellDoubleClick={(params, event) => {
                            if (params.field !== 'pickupNumber') return;
                            event.defaultMuiPrevented = true;
                            if (!params.row.pickupStatus || params.row.isCanceled === 'Y') return;
                            if (pickupNumberEdit || pickupNumberPendingRef.current) return;
                            setPickupNumberConfirmation({ shipmentId: params.row.shipmentId, value: String(params.value ?? '') });
                        }}
                        getRowClassName={(params) => params.row.isCanceled === 'Y' ? 'shipment-canceled' : ''}
                        autoHeight
                        disableRowSelectionOnClick
                        rowSelection={false}
                        disableColumnMenu
                        
                        // Server-side Pagination Configuration
                        pagination
                        paginationMode="server"
                        paginationModel={paginationModel}
                        rowCount={parseInt(pagination?.totalRecords || '0', 10)}
                        pageSizeOptions={[5, 10, 25, 50]}
                        
                        // Handle user interactions with the pagination controls
                        onPaginationModelChange={(newModel) => {
                            setPaginationModel(newModel);
                        }}
                        
                        sx={{
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: '#dbdbdb',
                            },
                            '& .sticky-action-header': {
                                position: 'sticky',
                                right: 0,
                                zIndex: 4,
                                backgroundColor: '#dbdbdb',
                                boxShadow: '-4px 0 6px -4px rgba(0, 0, 0, 0.35)',
                            },
                            '& .sticky-action-cell': {
                                position: 'sticky',
                                right: 0,
                                zIndex: 3,
                                backgroundColor: '#fff',
                                boxShadow: '-4px 0 6px -4px rgba(0, 0, 0, 0.25)',
                            },
                            '& .MuiDataGrid-row:hover .sticky-action-cell': {
                                backgroundColor: '#f5f5f5',
                            },
                            '& .MuiDataGrid-row.shipment-canceled, & .MuiDataGrid-row.shipment-canceled .sticky-action-cell': {
                                backgroundColor: '#ffdde2',
                            },
                            '& .MuiDataGrid-row.shipment-canceled:hover, & .MuiDataGrid-row.shipment-canceled:hover .sticky-action-cell': {
                                backgroundColor: '#ffc4cc',
                            },
                        }}
                    />
                </Box>
            </ErrorBoundary>

            <Dialog
                open={Boolean(pickupNumberConfirmation)}
                onClose={() => setPickupNumberConfirmation(null)}
                maxWidth="xs"
                fullWidth
                aria-labelledby="pickup-number-title"
            >
                <DialogTitle id="pickup-number-title">Add/Edit Pickup No</DialogTitle>
                <DialogContent>
                    <DialogContentText>Do you want to Add/Edit Pickup No?</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPickupNumberConfirmation(null)}>No</Button>
                    <Button variant="contained" onClick={() => {
                        setPickupNumberEdit(pickupNumberConfirmation);
                        setPickupNumberConfirmation(null);
                    }}>Yes</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={cancelShipmentId !== null}
                onClose={handleCloseCancelDialog}
                maxWidth="xs"
                fullWidth
                aria-labelledby="cancel-shipment-title"
                aria-describedby="cancel-shipment-description"
            >
                <DialogTitle id="cancel-shipment-title">Cancel shipment - {cancelRmNumber}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="cancel-shipment-description">
                        Are you sure you want to cancel this shipment?
                    </DialogContentText>
                    {cancelError && <Alert severity="error" sx={{ mt: 2 }}>{cancelError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCancelDialog} disabled={cancelLoading}>No</Button>
                    <Button onClick={handleConfirmCancel} disabled={cancelLoading} color="error" variant="contained">
                        {cancelLoading ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>

         <Dialog
    // Open only if we have a type
    open={Boolean(activeForm.type)} 
    onClose={handleClosePickupForm}
    maxWidth="lg"
    fullWidth
    // Prevent the DataGrid from stealing focus back during the click
    disableRestoreFocus 
>
    <DialogContent sx={{ p: 0 }}>
        {activeForm.type === 'scanStatus' && (
            <ShipmentScanStatus
                shipment={activeForm.data}
                onClose={handleClosePickupForm}
                onCompleteSuccess={handleCompleteSuccess}
            />
        )}
        {activeForm.type === 'airPickup' && (
            <AirPickupEntryForm
                rowData={activeForm.data}
                handleClose={handleClosePickupForm}
                onCompleteSuccess={handleCompleteSuccess}
            />
        )}
        {activeForm.type === 'fclPickup' && (
            <FCLPickupEntryForm
                rowData={activeForm.data}
                handleClose={handleClosePickupForm}
            />
        )}
    </DialogContent>
</Dialog>
<div style={{ display: 'none' }}>
    <ShipmentPrintTemplate 
        ref={printRef} 
        data={printData} 
        type={currentTab} 
    />
</div>
            <Snackbar
                open={Boolean(successMessage)}
                autoHideDuration={4000}
                onClose={(event, reason) => {
                    if (reason !== 'clickaway') setSuccessMessage('');
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="success" variant="filled" onClose={() => setSuccessMessage('')}>
                    {successMessage}
                </Alert>
            </Snackbar>
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
            <Snackbar
                open={Boolean(pickupError)}
                autoHideDuration={4000}
                onClose={(event, reason) => {
                    if (reason !== 'clickaway') setPickupError('');
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="error" variant="filled" onClose={() => setPickupError('')}>
                    {pickupError}
                </Alert>
            </Snackbar>
        </>
        
    );
}

