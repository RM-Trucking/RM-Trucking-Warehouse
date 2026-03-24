import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Divider, Tabs, Tab,
    Button, Dialog, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    DialogContent, IconButton
} from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
import { useDispatch, useSelector } from '../../../../../RM-Trucking/frontend/src/redux/store';
import { setCurrentCarrierTab } from '../../../../../RM-Trucking/frontend/src/redux/slices/carrier';
import ErrorFallback from '../../../../../RM-Trucking/frontend/src/sections/shared/ErrorBoundary';
import Iconify from '../../components/iconify';
// ----------------------------------------------------------------------


ShipmentTabs.propTypes = {};

export default function ShipmentTabs({ }) {
    // const { currentCarrierTab } = useSelector(({ carrierdata }) => carrierdata);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState('active');

    // Dummy data for each shipment type
    const airFormData = [
        { rmNumber: 'AIR-001', customer: 'Customer A', station: 'Station 1', billNumber: 'BILL-A001' },
        { rmNumber: 'AIR-002', customer: 'Customer B', station: 'Station 2', billNumber: 'BILL-A002' },
        { rmNumber: 'AIR-003', customer: 'Customer C', station: 'Station 3', billNumber: 'BILL-A003' },
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

    const handleAction = (rmNumber) => {
        console.log('Action clicked for:', rmNumber);
        // Add action logic here
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

                {/* Table Section */}
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#dbdbdb' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, fontSize: '14px' }}>RM Number</TableCell>
                                <TableCell sx={{ fontWeight: 600, fontSize: '14px' }}>Customer</TableCell>
                                <TableCell sx={{ fontWeight: 600, fontSize: '14px' }}>Station</TableCell>
                                <TableCell sx={{ fontWeight: 600, fontSize: '14px' }}>Bill Number</TableCell>
                                <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {dataMap[currentTab].map((row, index) => (
                                <TableRow key={index} sx={{ '&:nth-of-type(odd)': { bgcolor: '#f9f9f9' } }}>
                                    <TableCell>{row.rmNumber}</TableCell>
                                    <TableCell>{row.customer}</TableCell>
                                    <TableCell>{row.station}</TableCell>
                                    <TableCell>{row.billNumber}</TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleAction(row.rmNumber)}
                                            sx={{ color: '#A22' }}
                                        >
                                            <Iconify icon="eva:eye-fill" width={20} />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </ErrorBoundary>
        </>
    );
}
