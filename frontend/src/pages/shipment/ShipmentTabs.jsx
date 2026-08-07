import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    Box, Divider, Tabs, Tab, IconButton, Dialog, DialogContent, Checkbox,
    FormControlLabel
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { ErrorBoundary } from 'react-error-boundary';
import { useReactToPrint } from 'react-to-print';
import { useDispatch, useSelector } from '../../redux/store';
import { getShipmentData } from '../../redux/slices/shipment';

import ErrorFallback from '../../../../../RM-Trucking/frontend/src/sections/shared/ErrorBoundary';
import Iconify from '../../components/iconify';
import ShipmentPrintTemplate from './ShipmentPrintTemplate';
import ShipmentScanStatus from './ShipmentScanStatus';

// ----------------------------------------------------------------------

ShipmentTabs.propTypes = {};

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

export default function ShipmentTabs({ onViewShipment }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    
    const {
        shipmentData: apiShipmentData,
        isLoading,
        pagination,
    } = useSelector((state) => state.shipmentdata);
    
    const [currentTab, setCurrentTab] = useState('active');
    const [airStatusFilters, setAirStatusFilters] = useState([]);
    // const [selectedRowData, setSelectedRowData] = useState(null);
    // const [openPickupFormType, setOpenPickupFormType] = useState(null);
    const [activeForm, setActiveForm] = useState({ type: null, data: null });
    const printRef = useRef();
    const [printData, setPrintData] = useState(null);
    
    const shipmentTypeMap = { active: 'AIR', inactive: 'LCL', incomplete: 'FCL' };
    const shipmentData = apiShipmentData
        .filter((shipment) => shipment.shipmentType === shipmentTypeMap[currentTab])
        .map((shipment) => ({
            ...shipment,
            rmNumber: shipment.barcodeNumber,
            customer: shipment.customerName || shipment.customerId,
            station: shipment.stationName || shipment.stationId,
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

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        onAfterPrint: () => setPrintData(null),
    });

    const onPrintClick = (rowData) => {
        // flushSync forces React to synchronously commit the DOM update before
        // handlePrint() reads the ref — fixes first-click issue after reload.
        flushSync(() => setPrintData(rowData));
        handlePrint();
    };

    const TABS = [
        { value: 'active', label: 'Air Form' },
        { value: 'inactive', label: 'LCL Form' },
        { value: 'incomplete', label: 'FCL Form' },
    ];

    // Error boundary info
    const logError = (error, info) => {
        console.error("Error caught:", info);
        console.log(error);
    };

    const OnTabChange = (newValue) => {
        setCurrentTab(newValue);
    };

    const handleAction = (rowData) => {
        onViewShipment(rowData);
    };

    const handleHandExtended = (rowData) => {
        setActiveForm({ type: 'scanStatus', data: rowData });
    };

const handleClosePickupForm = () => {
    setActiveForm({ type: null, data: null });
};

    const handleFileDocumentBox = (rowData) => {
        console.log('File document clicked for:', rowData.rmNumber, 'on tab:', currentTab);
        // Navigate based on current tab to the shipment form with the form type
        const formTypeMap = {
            active: 'air',
            inactive: 'lcl',
            incomplete: 'fcl',
        };
        navigate('/app/shipment-form', { 
            state: { 
                rowData,
                openPickupForm: formTypeMap[currentTab]
            } 
        });
    };

    // Fetch the current server-side page.
    useEffect(() => {
        dispatch(getShipmentData({
            pageNo: paginationModel.page + 1,
            pageSize: paginationModel.pageSize,
        }));
    }, [dispatch, paginationModel.page, paginationModel.pageSize]);

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

    const handleStatusFilterChange = (value) => {
        setAirStatusFilters([value]);
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
            headerName: currentTab === 'active' ? 'Air Bill No' : 'Bill Number',
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
            renderCell: (params) => renderStatus(Boolean(params.value)),
        }));

    const pickupNumberColumn = {
        field: 'pickupNumber',
        headerName: 'Pickup No',
        minWidth: 130,
        flex: 0.8,
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
                            onClick={(e) => { e.stopPropagation(); handleAction(params.row); }}
                            sx={{ color: '#A22' }}
                        >
                            <Iconify icon="eva:eye-fill" width={20} />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); onPrintClick(params.row); }}
                            sx={{ color: '#A22' }}
                        >
                            <Iconify icon="mdi:printer" width={20} />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (params.row.isShipped !== 'Y') {
                                    handleHandExtended(params.row);
                                } else {
                                    handleFileDocumentBox(params.row);
                                }
                            }}
                            sx={{ color: '#A22' }}
                        >
                            {params.row.isShipped !== 'Y' ? (
                                <ScanActionIcon width={20} />
                            ) : (
                                <Iconify icon="mdi:file-document-box" width={20} />
                            )}
                        </IconButton>
                    </Box>
                );
            },
        };

    const columns = currentTab === 'active'
        ? [...baseColumns, ...airStatusColumns, pickupNumberColumn, actionColumn]
        : [...baseColumns, actionColumn];

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
                                label={tab.label}
                                sx={{
                                    '&.Mui-selected': {
                                        color: '#A22',
                                        fontWeight: '600',
                                    },
                                    color: 'black',
                                }}
                            />
                        ))}
                    </Tabs>
                </Box>
                <Divider sx={{ borderColor: 'rgba(143, 143, 143, 1)', mb: 2 }} />

                {currentTab === 'active' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {statusOptions.map((status) => (
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

                <Box sx={{ width: "100%", flex: 1, mt: currentTab === 'active' ? 0 : 2 }}>
                    <DataGrid
                        rows={shipmentData}
                        columns={columns}
                        loading={isLoading}
                        getRowId={(row) => row.shipmentId}
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
                        }}
                    />
                </Box>
            </ErrorBoundary>

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
        </>
        
    );
}

ShipmentTabs.propTypes = {
    onViewShipment: PropTypes.func.isRequired,
};
