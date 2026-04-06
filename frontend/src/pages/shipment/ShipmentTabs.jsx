import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    Box, Divider, Tabs, Tab, IconButton, Dialog, DialogContent
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { ErrorBoundary } from 'react-error-boundary';
import { useReactToPrint } from 'react-to-print';
import { useDispatch, useSelector } from '../../../../../RM-Trucking/frontend/src/redux/store';

// Replace these with your actual shipment redux slice imports
import { setCurrentCarrierTab } from '../../../../../RM-Trucking/frontend/src/redux/slices/carrier';
// import { getShipmentData } from '../../../../../RM-Trucking/frontend/src/redux/slices/shipment'; 

import ErrorFallback from '../../../../../RM-Trucking/frontend/src/sections/shared/ErrorBoundary';
import Iconify from '../../components/iconify';
import ProofofDelivery from './ProofofDelivery';
import AirPickupEntryForm from './AirPickupEntryForm';
import LCLPickupEntryForm from './LCLPickupEntryForm';
import FCLPickupEntryForm from './FCLPickupEntryForm';
import ShipmentPrintTemplate from './ShipmentPrintTemplate';

// ----------------------------------------------------------------------

const DUMMY_SHIPMENT_DATA_MAP = {
    active: [
        { rmNumber: 'AIR-001', customer: 'Ventana Serra LLC', station: 'MIA', billNumber: '00103252026' },
        { rmNumber: 'AIR-002', customer: 'Atlantic Cargo', station: 'JFK', billNumber: '15745001982' },
        { rmNumber: 'AIR-003', customer: 'Pacific Freight', station: 'LAX', billNumber: '93300124567' },
        { rmNumber: 'AIR-004', customer: 'Northline Logistics', station: 'ORD', billNumber: '44092837165' },
    ],
    inactive: [
        { rmNumber: 'LCL-001', customer: 'Ocean Lane', station: 'NYC', billNumber: 'LCL-8891001' },
        { rmNumber: 'LCL-002', customer: 'Harbor Freight Group', station: 'SAV', billNumber: 'LCL-8891002' },
        { rmNumber: 'LCL-003', customer: 'Bluewater Lines', station: 'HOU', billNumber: 'LCL-8891003' },
        { rmNumber: 'LCL-004', customer: 'PortLink Logistics', station: 'LGB', billNumber: 'LCL-8891004' },
    ],
    incomplete: [
        { rmNumber: 'FCL-001', customer: 'Pacific Containers', station: 'LAX', billNumber: 'FCL-7745001' },
        { rmNumber: 'FCL-002', customer: 'Trans Atlantic Cargo', station: 'MIA', billNumber: 'FCL-7745002' },
        { rmNumber: 'FCL-003', customer: 'Gateway Shipping', station: 'SEA', billNumber: 'FCL-7745003' },
        { rmNumber: 'FCL-004', customer: 'Prime Marine Lines', station: 'OAK', billNumber: 'FCL-7745004' },
    ],
};

ShipmentTabs.propTypes = {};

export default function ShipmentTabs({ }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    
    // Hypothetical Redux state for shipments (Adjust 'shipmentdata' to match your actual store)
    // const { shipmentData, isLoading, pagination, searchStr } = useSelector((state) => state.shipmentdata);
    
    const [currentTab, setCurrentTab] = useState('active');
    const [openForm, setOpenForm] = useState(null);
    // const [selectedRowData, setSelectedRowData] = useState(null);
    const [openPOD, setOpenPOD] = useState(false);
    const [selectedPODRow, setSelectedPODRow] = useState(null);
    // const [openPickupFormType, setOpenPickupFormType] = useState(null);
    const [activeForm, setActiveForm] = useState({ type: null, data: null });
    const printRef = useRef();
    const [printData, setPrintData] = useState(null);
    
    // --- TEMPORARY FALLBACKS ---
    // Remove these once your Redux state is connected
    const shipmentData = DUMMY_SHIPMENT_DATA_MAP[currentTab] || [];
    const isLoading = false;
    const pagination = { page: 1, pageSize: 10, totalRecords: shipmentData.length };
    const searchStr = '';
    // ---------------------------

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

    // useEffect(() => {
    //     // Fetch shipment data using slice
    //     dispatch(getShipmentData({ page: 1, size: 10 }));
    // }, [dispatch]);

    // Log shipment data for checking
    useEffect(() => {
        console.log('Shipment Data:', shipmentData);
    }, [shipmentData]);

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
        // If you are tracking the tab in Redux:
        dispatch(setCurrentCarrierTab(newValue));
    };

    const handleAction = (rowData) => {
        console.log('Action clicked for:', rowData.rmNumber);
        setSelectedPODRow(rowData);
        setOpenPOD(true);
    };

    const handleClosePOD = () => {
        setOpenPOD(false);
        setSelectedPODRow(null);
    };

     const handleHandExtended = (rowData) => {
    const typeMap = {
        active: 'air',
        inactive: 'lcl',
        incomplete: 'fcl',
    };

    setActiveForm({
        type: typeMap[currentTab] || null,
        data: rowData
    });
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

    // 1. Fetch data whenever the tab changes
    useEffect(() => {
        // Example Redux Dispatch:
        // dispatch(getShipmentData({ 
        //     pageNo: 1, 
        //     pageSize: paginationModel.pageSize, 
        //     searchStr: searchStr, 
        //     status: currentTab 
        // }));
        
        // Reset local pagination to page 0 when switching tabs
        setPaginationModel(prev => ({ ...prev, page: 0 }));
    }, [currentTab, searchStr, dispatch]);

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

    // Define DataGrid columns
    const columns = [
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
            headerName: 'Bill Number',
            flex: 1,
            minWidth: 150,
            headerAlign: 'left',
        },
        {
            field: 'action',
            headerName: 'Action',
            width: 180,
            headerAlign: 'center',
            align: 'center',
            sortable: false,
            filterable: false,
            renderCell: (params) => {
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                            onClick={(e) => { e.stopPropagation(); handleHandExtended(params.row); }}
                            sx={{ color: '#A22' }}
                        >
                            <Iconify icon="mdi:hand-extended" width={20} />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleFileDocumentBox(params.row); }}
                            sx={{ color: '#A22' }}
                        >
                            <Iconify icon="mdi:file-document-box" width={20} />
                        </IconButton>
                    </Box>
                );
            },
        }
    ];

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

                <Box sx={{ width: "100%", flex: 1, mt: 2 }}>
                    <DataGrid
                        rows={shipmentData}
                        columns={columns}
                        loading={isLoading}
                        getRowId={(row) => row.rmNumber} // Ensure this maps to a unique ID from your API
                        autoHeight
                        disableRowSelectionOnClick
                        
                        // Server-side Pagination Configuration
                        pagination
                        paginationMode="server"
                        paginationModel={paginationModel}
                        rowCount={parseInt(pagination?.totalRecords || '0', 10)}
                        pageSizeOptions={[5, 10, 25, 50]}
                        
                        // Handle user interactions with the pagination controls
                        onPaginationModelChange={(newModel) => {
                            setPaginationModel(newModel);
                            
                            // Dispatch API call for the new page
                            // dispatch(getShipmentData({
                            //     pageNo: newModel.page + 1,
                            //     pageSize: newModel.pageSize,
                            //     searchStr: searchStr,
                            //     status: currentTab
                            // }));
                        }}
                        
                        sx={{
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: '#dbdbdb',
                            },
                        }}
                    />
                </Box>
            </ErrorBoundary>

            {/* Proof of Delivery Dialog */}
            <Dialog
                open={openPOD}
                onClose={handleClosePOD}
                maxWidth="lg"
                fullWidth
                disableRestoreFocus
                TransitionProps={{ onExited: () => setSelectedPODRow(null) }}
            >
                <DialogContent sx={{ p: 0 }}>
                    {selectedPODRow && <ProofofDelivery rowData={selectedPODRow} handleClose={handleClosePOD} />}
                </DialogContent>
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
        {activeForm.type === 'air' && (
            <AirPickupEntryForm 
                handleClose={handleClosePickupForm} 
                rowData={activeForm.data} 
            />
        )}
        {activeForm.type === 'lcl' && (
            <LCLPickupEntryForm 
                handleClose={handleClosePickupForm} 
                rowData={activeForm.data} 
            />
        )}
        {activeForm.type === 'fcl' && (
            <FCLPickupEntryForm 
                handleClose={handleClosePickupForm} 
                rowData={activeForm.data} 
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