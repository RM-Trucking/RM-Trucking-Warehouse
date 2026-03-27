import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Divider, Tabs, Tab,
    Button, Dialog, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    DialogContent, DialogTitle, IconButton
} from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentCarrierTab } from '../../redux/slices/carrier';
import { getShipmentData } from '../../redux/slices/shipment';
import ErrorFallback from '../../sections/shared/ErrorBoundary';
import Iconify from '../../components/iconify';
import AirPickupEntryForm from './AirPickupEntryForm';
import LCLPickupEntryForm from './LCLPickupEntryForm';
import FCLPickupEntryForm from './FCLPickupEntryForm';
import ProofofDelivery from './ProofofDelivery';
// ----------------------------------------------------------------------


ShipmentTabs.propTypes = {};

export default function ShipmentTabs({ }) {
    // const { currentCarrierTab } = useSelector(({ carrierdata }) => carrierdata);
    const { shipmentData } = useSelector(({ shipmentdata }) => shipmentdata);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState('active');
    const [openForm, setOpenForm] = useState(null);
    const [selectedRowData, setSelectedRowData] = useState(null);
    const [openPOD, setOpenPOD] = useState(false);
    const [selectedPODRow, setSelectedPODRow] = useState(null);

    // Dummy data for each shipment type
    const airFormData = [        
        {
            "barcodeNumber": 155166,
            "customer": "VENTANA SERRA LLC | Sweetwater | FL",
            "customerAccountNumber": "276",
            "consignee": "001 - AA - AMERICAN 609 S ACCESS RD, SELF, ORD",
            "airbill": "00103252026",
            "booking": 267482346,
            "custRefNumber": "S26CHI015516",
            "misc": null,
            "instruction": null,
            "pieces": 6,
            "weight": 2010,
            "timeInForwarder": null,
            "timeOutForwarder": null,
            "timeInAirline": null,
            "timeOutAirline": null,
            "receivedAt": null,
            "receivedBy": null,
            "receivedDate": null,
            "receivedTime": null,
            "warehouseIds": [
                100006316,
                100006315,
                100006310,
                100006314,
                100006313,
                100006312
            ],
            "containerNumbers": [],
            "driverName": null,
            "driverNumber": null,
            "createdAt": "2026-03-25T18:32:02.965Z",
            "createdBy": "KOTEST",
            "createdOnSystem": "RMTDEVEL.RMTRUCKING.COM",
            "weightUnit": "lb",
            "date": "3/25/26",
            "collect": "",
            "prepaid": "",
            "rmCharges": 0,
            "pickupStatus": "N",
            "pickupEntryNumber": null,
            "isCancelled": "N",
            "scanned": false,
            "shipped": false
        },
        {
            "barcodeNumber": 155165,
            "customer": "VENTANA SERRA LLC | Sweetwater | FL",
            "customerAccountNumber": "276",
            "consignee": "001 - AA - AMERICAN 609 S ACCESS RD, SELF, ORD",
            "airbill": "00103252026",
            "booking": 267482346,
            "custRefNumber": "S26CHI015516",
            "misc": null,
            "instruction": null,
            "pieces": 14,
            "weight": 1611,
            "timeInForwarder": null,
            "timeOutForwarder": null,
            "timeInAirline": null,
            "timeOutAirline": null,
            "receivedAt": null,
            "receivedBy": null,
            "receivedDate": null,
            "receivedTime": null,
            "warehouseIds": [
                100006110,
                100006140,
                100006352,
                100006351,
                100006349,
                100006334,
                100006356,
                100006326,
                100006325,
                100006367,
                100006368,
                100006311,
                100006332,
                100006329
            ],
            "containerNumbers": [],
            "driverName": null,
            "driverNumber": null,
            "createdAt": "2026-03-25T18:30:24.730Z",
            "createdBy": "KOTEST",
            "createdOnSystem": "RMTDEVEL.RMTRUCKING.COM",
            "weightUnit": "lb",
            "date": "3/25/26",
            "collect": "",
            "prepaid": "",
            "rmCharges": 0,
            "pickupStatus": "N",
            "pickupEntryNumber": null,
            "isCancelled": "N",
            "scanned": true,
            "shipped": false
        },
        
        // { rmNumber: 'AIR-001', customer: 'Customer A', station: 'Station 1', billNumber: 'BILL-A001' },
        // { rmNumber: 'AIR-002', customer: 'Customer B', station: 'Station 2', billNumber: 'BILL-A002' },
        // { rmNumber: 'AIR-003', customer: 'Customer C', station: 'Station 3', billNumber: 'BILL-A003' },
    ];

    const lclFormData = [
        { rmNumber: 'LCL-001', customer: 'Customer D', station: 'Station 1', billNumber: 'BILL-L001' },
        { rmNumber: 'LCL-002', customer: 'Customer E', station: 'Station 2', billNumber: 'BILL-L002' },
        { rmNumber: 'LCL-003', customer: 'Customer F', station: 'Station 3', billNumber: 'BILL-L003' },
    ];

    const fclFormData = [
        { rmNumber: 'FCL-001', customer: 'Customer G', station: 'Station 1', billNumber: 'BILL-F001' },
        { rmNumber: 'FCL-002', customer: 'Customer H', station: 'Station 2', billNumber: 'BILL-F002' },
        { rmNumber: 'FCL-003', customer: 'Customer I', station: 'Station 3', billNumber: 'BILL-F003' },
    ];

    const dataMap = {
        'active': airFormData,
        'inactive': lclFormData,
        'incomplete': fclFormData,
    };

    useEffect(() => {
        // Fetch shipment data using slice
        dispatch(getShipmentData({ page: 1, size: 10 }));
    }, [dispatch]);

    // Log shipment data for checking
    useEffect(() => {
        console.log('Shipment Data:', shipmentData);
    }, [shipmentData]);

    const TABS = [
        {
            value: 'active',
            label: 'Air Form',
        },
        {
            value: 'inactive',
            label: 'LCL Form',
        },
        {
            value: 'incomplete',
            label: 'FCL Form',
        },
    ];

    // error boundary info
    const logError = (error, info) => {
        // Use an error reporting service here
        console.error("Error caught:", info);
        console.log(error);
    };

    const OnTabChange = (newValue) => {
        console.log('new tab value', newValue);
        setCurrentTab(newValue);
        dispatch(setCurrentCarrierTab(newValue));
    }

    const handleAction = (rowData) => {
        setSelectedRowData(rowData);
        if (currentTab === 'active') {
            setOpenForm('air');
        } else if (currentTab === 'inactive') {
            setOpenForm('lcl');
        } else if (currentTab === 'incomplete') {
            setOpenForm('fcl');
        }
    }

    const handleCloseForm = () => {
        setOpenForm(null);
        setSelectedRowData(null);
    }

    const handleDocument = (row) => {
        setSelectedPODRow(row);
        setOpenPOD(true);
    }

    const handleClosePOD = () => {
        setOpenPOD(false);
        setSelectedPODRow(null);
    }

    return (
        <>
            <ErrorBoundary
                FallbackComponent={ErrorFallback}
                onError={logError}
                onReset={() => {
                    // Optional: reset app state here if necessary before retry
                    console.log("Error boundary reset triggered");
                }}
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
                        onChange={(event, newValue) => {
                            OnTabChange(newValue);
                        }}
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
                                        color: '#A22', // Color for the selected tab text
                                        fontWeight: '600',
                                    },
                                    color: 'black', // Default text color
                                }}
                            />
                        ))}
                    </Tabs>
                </Box>
                <Divider sx={{ borderColor: 'rgba(143, 143, 143, 1)', mb: 2 }} />

                {/* Conditionally render form or table */}
                {openForm === 'air' && selectedRowData ? (
                    <AirPickupEntryForm rowData={selectedRowData} handleClose={handleCloseForm} />
                ) : openForm === 'lcl' && selectedRowData ? (
                    <LCLPickupEntryForm rowData={selectedRowData} handleClose={handleCloseForm} />
                ) : openForm === 'fcl' && selectedRowData ? (
                    <FCLPickupEntryForm rowData={selectedRowData} handleClose={handleCloseForm} />
                ) : (
                    /* Table Section */
                    <TableContainer component={Paper} sx={{ mt: 2 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: '#dbdbdb' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '14px' }}>RM Pro No</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '14px' }}>Customer</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '14px' }}>Station</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '14px' }}>Air Bill No</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '14px' }}>Scan Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '14px' }}>Shipment Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '14px' }}>Pickup Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '14px' }}>OFD Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '14px' }}>POD Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '14px' }}>Pickup No</TableCell>
                                     

                                    <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {dataMap[currentTab].map((row, index) => (
                                    <TableRow key={index} sx={{ '&:nth-of-type(odd)': { bgcolor: '#f9f9f9' } }}>
                                        <TableCell>{row.barcodeNumber}</TableCell>
                                        <TableCell>{row.customer}</TableCell>
                                        <TableCell>{row.booking}</TableCell>
                                        <TableCell>{row.airbill}</TableCell>
                                        <TableCell>{row.scanned ? 'Scanned' : 'Not Scanned'}</TableCell>
                                        <TableCell>{row.shipped ? 'Shipped' : 'Not Shipped'}</TableCell>
                                        <TableCell>{row.pickupStatus === 'N' ? 'Not Picked Up' : 'Picked Up'}</TableCell>
                                        <TableCell>{row.timeOutAirline ? 'OFD' : 'Not OFD'}</TableCell>
                                        <TableCell>{row.receivedDate ? 'POD' : 'Not POD'}</TableCell>
                                        <TableCell>{row.pickupEntryNumber || 'N/A'}</TableCell>

                                        <TableCell sx={{ textAlign: 'center' }}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleAction(row)}
                                            >
                                                <Iconify icon="eva:eye-fill" width={20} />
                                            </IconButton>
                                             <IconButton
                                                size="small"
                                                onClick={() => handleAction(row)}
                                            >
                                                <Iconify icon="eva:printer-fill" width={20} />
                                            </IconButton>
                                             <IconButton
                                                size="small"
                                                onClick={() => handleAction(row)}
                                            >
                                                <Iconify icon="mdi:hand-extended" width={20} />
                                            </IconButton>
                                             <IconButton
                                                size="small"
                                                onClick={() => handleDocument(row)}
                                            >
                                                <Iconify icon="mdi:file-document-box" width={20} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </ErrorBoundary>

            {/* Proof of Delivery Dialog */}
            <Dialog open={openPOD} onClose={handleClosePOD} maxWidth="lg" fullWidth>  
                {/* <DialogTitle>Proof of Delivery</DialogTitle> */}
                <DialogContent sx={{ p: 0 }}>
                    {selectedPODRow && <ProofofDelivery rowData={selectedPODRow} onClose={handleClosePOD} />}
                </DialogContent>
            </Dialog>
        </>
    );
}
