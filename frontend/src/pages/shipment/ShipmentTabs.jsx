import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Divider, Tabs, Tab,
    Button, Dialog,
    DialogContent
} from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
import { useDispatch, useSelector } from '../../../../../RM-Trucking/frontend/src/redux/store';
import { setCurrentCarrierTab } from '../../../../../RM-Trucking/frontend/src/redux/slices/carrier';
import ErrorFallback from '../../../../../RM-Trucking/frontend/src/sections/shared/ErrorBoundary';
// ----------------------------------------------------------------------


ShipmentTabs.propTypes = {};

export default function ShipmentTabs({ }) {
    // const { currentCarrierTab } = useSelector(({ carrierdata }) => carrierdata);
    const dispatch = useDispatch();
    const navigate = useNavigate();
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
        dispatch(setCurrentCarrierTab(newValue));
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
                        // value={currentCarrierTab}
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
            </ErrorBoundary>
        </>
    );
}
