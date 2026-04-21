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
    pagination: { page: 1, pageSize: 10, totalRecords: 0 },
    // Carrier search states
    carrierOptions: [],
    carrierLoading: false,
    // Customer search states
    customerOptions: [],
    customerLoading: false,
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
        // Carrier search actions
        startCarrierLoading(state) {
            state.carrierLoading = true;
            state.carrierOptions = []; // Clear previous options when starting new search
        },
        getCarrierOptionsSuccess(state, action) {
            state.carrierLoading = false;
            state.carrierOptions = action.payload || [];
        },
        carrierSearchError(state) {
            state.carrierLoading = false;
            state.carrierOptions = [];
        },
        // Customer search actions
        startCustomerLoading(state) {
            state.customerLoading = true;
            state.customerOptions = []; // Clear previous options when starting new search
        },
        getCustomerOptionsSuccess(state, action) {
            state.customerLoading = false;
            state.customerOptions = action.payload || [];
        },
        customerSearchError(state) {
            state.customerLoading = false;
            state.customerOptions = [];
        },
    },
});

export default slice.reducer;

// Actions

// ----------------------------------------------------------------------
// enroute api calls
export function getEnrouteData({ page = 1, pageSize = 10, searchTerm = '', filters = {} } = {}) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            let url = `/enroute?page=${page}&pageSize=${pageSize}`;

            //  let url = `/enroute`;

            // Add search term if provided
            if (searchTerm && searchTerm.trim()) {
                url += `&searchTerm=${encodeURIComponent(searchTerm.trim())}`;
            }

            // Add filter parameters if provided
            if (filters.carrier && filters.carrier.trim()) {
                url += `&carrier=${encodeURIComponent(filters.carrier.trim())}`;
            }
            if (filters.freightForwarder && filters.freightForwarder.trim()) {
                url += `&freightForwarder=${encodeURIComponent(filters.freightForwarder.trim())}`;
            }
            if (filters.fromDate) {
                url += `&fromDate=${encodeURIComponent(filters.fromDate)}`;
            }
            if (filters.toDate) {
                url += `&toDate=${encodeURIComponent(filters.toDate)}`;
            }

            const response = await axios.get(url);
            // Transform API data to match DataGrid format
            const transformedData = response.data.data.map((item) => ({
                id: item.enrouteId,
                carrier: item.carrierName,
                freightForwarder: item.customerName,
                estimatedDate: new Date(item.estimatedDate).toLocaleDateString('en-US'),
                scanShippedDate: new Date(item.shippedDate).toLocaleDateString('en-US'),
                createdDate: new Date(item.createdAt).toLocaleDateString('en-US'), // Using createdAt
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

// Search carriers action
export function searchCarriers(searchTerm) {
    return async () => {
        if (!searchTerm || searchTerm.length < 1) {
            dispatch(slice.actions.getCarrierOptionsSuccess([]));
            return;
        }

        dispatch(slice.actions.startCarrierLoading());
        try {
            const response = await axios.get(`/maintenance/carrier/dropdown?search=${searchTerm}`);

            // Extract data from the response format: {success: true, data: [...]}
            const carriers = response.data?.data || [];
            dispatch(slice.actions.getCarrierOptionsSuccess(carriers));
        } catch (error) {
            console.error('Error searching carriers:', error);
            dispatch(slice.actions.carrierSearchError());
        }
    };
}

// Search customers action
export function searchCustomers(searchTerm) {
    return async () => {
        if (!searchTerm || searchTerm.length < 1) {
            dispatch(slice.actions.getCustomerOptionsSuccess([]));
            return;
        }

        dispatch(slice.actions.startCustomerLoading());
        try {
            const response = await axios.get(`/maintenance/customer/dropdown?search=${searchTerm}`);

            // Extract data from the response format: {success: true, data: [...]}
            const customers = response.data?.data || [];
            dispatch(slice.actions.getCustomerOptionsSuccess(customers));
        } catch (error) {
            console.error('Error searching customers:', error);
            dispatch(slice.actions.customerSearchError());
        }
    };
}
export function createEnroute(formData) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            // Transform form data to API payload format
            const payload = {
                carrierId: formData.deliveryCarrier?.carrierId || parseInt(formData.deliveryCarrier), // Default fallback
                customerId: formData.freightForwarder?.customerId || parseInt(formData.freightForwarder), // Default fallback
                stationId: formData.freightForwarder?.stationId || parseInt(formData.stationId), // Get from freight forwarder selection or fallback
                estimatedDate: formData.estimateDate,
                shippedDate: formData.shippedDate,
                toEmails: formData.toEmails || [],
                pros: formData.items.filter(item => item.pieces || item.weight || item.shipper).map(item => ({
                    proNumber: item.proNumber || `PRO${Date.now()}${Math.floor(Math.random() * 1000)}`, // Generate if not provided
                    pieces: parseInt(item.pieces) || 0,
                    weight: parseFloat(item.weight) || 0,
                    shipper: item.shipper || "",
                    activeStatus: "Y" // Default as requested
                }))
            };

            console.log('Sending payload:', payload);

            const response = await axios.post('/enroute', payload);
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