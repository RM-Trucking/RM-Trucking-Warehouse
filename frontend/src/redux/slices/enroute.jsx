import { createSlice } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
//
import { dispatch } from '../store';

// ----------------------------------------------------------------------

const initialState = {
    isLoading: false,
    error: null,
    enrouteSuccess: false,
    enrouteData: [],
    pagination: { page: 1, pageSize: 20, totalRecords: 0 },
};

const slice = createSlice({
    name: 'enroute',
    initialState,
    reducers: {
        hasError(state, action) {
            state.isLoading = false;
            // Extract error message properly
            const errorPayload = action.payload;
            if (typeof errorPayload === 'string') {
                state.error = errorPayload;
            } else if (errorPayload && typeof errorPayload === 'object') {
                state.error = errorPayload.message || errorPayload.error || 'An error occurred';
            } else {
                state.error = 'Something went wrong';
            }
        },
        // START LOADING
        startLoading(state) {
            state.isLoading = true;
            state.enrouteSuccess = false;
            state.error = null;
        },
        // get enroute success
        getEnrouteDataSuccess(state, action) {
            state.isLoading = false;
            state.enrouteSuccess = true;
            state.enrouteData = action.payload.data;
            state.pagination = {
                page: action.payload?.pagination?.page || state.pagination?.page,
                pageSize: action.payload?.pagination?.pageSize || state.pagination?.pageSize,
                totalRecords: action.payload?.pagination?.total || state.pagination?.totalRecords || state.enrouteData.length,
            };
        },
        // clear error
        clearError(state) {
            state.error = null;
        },
    },
});

export default slice.reducer;

// Actions

// ----------------------------------------------------------------------
// enroute api calls
export function getEnrouteData({ page = 1, size = 20 } = {}) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            // const response = await axios.get(`/api/enroute?page=${page}&size=${size}`);
            const response = await axios.get(`/enroute`);
            // Transform API data to match DataGrid format
            const transformedData = response.data.data.map((item) => ({
                id: item.enrouteId,
                carrier: item.carrierName,
                freightForwarder: item.customerName,
                estimatedDate: new Date(item.estimatedDate).toLocaleDateString('en-US'),
                scanShippedDate: new Date(item.shippedDate).toLocaleDateString('en-US'),
                createdDate: new Date(item.shippedDate).toLocaleDateString('en-US'), // Using shippedDate as createdDate since not provided
                stationName: item.stationName,
                prosCount: item.pros?.length || 0,
                rawData: item // Keep original data for reference
            }));

            dispatch(slice.actions.getEnrouteDataSuccess({
                data: transformedData,
                pagination: response.data.pagination
            }));
        } catch (error) {
            console.error('Error fetching enroute data:', error);
            dispatch(slice.actions.hasError(error));
        }
    };
}

// Clear error action
export function clearEnrouteError() {
    return async () => {
        dispatch(slice.actions.clearError());
    };
}

// Create new enroute
export function createEnroute(formData) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.post('/api/enroute', formData);
            // Refresh data after successful creation
            dispatch(getEnrouteData());
            return response.data;
        } catch (error) {
            console.error('Error creating enroute:', error);
            dispatch(slice.actions.hasError(error));
            throw error;
        }
    };
}