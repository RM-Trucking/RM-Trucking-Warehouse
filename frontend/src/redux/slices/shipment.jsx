import { createSlice } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
//
import { dispatch } from '../store';

// ----------------------------------------------------------------------

const initialState = {
    isLoading: false,
    error: null,
    shipmentSuccess: false,
    shipmentData: [],
    pagination: { page: 1, pageSize: 10, totalRecords: 0 },
};

const slice = createSlice({
    name: 'shipment',
    initialState,
    reducers: {
        hasError(state, action) {
            state.isLoading = false;
            state.error = action.payload || action.payload.error;
        },
        // START LOADING
        startLoading(state) {
            state.isLoading = true;
            state.shipmentSuccess = false;
            state.error = null;
        },
        // get shipment success
        getShipmentDataSuccess(state, action) {
            state.isLoading = false;
            state.shipmentSuccess = true;
            state.shipmentData = action.payload.data;
            state.pagination = {
                page: action.payload?.pagination?.page || state.pagination?.page,
                pageSize: action.payload?.pagination?.pageSize || state.pagination?.pageSize,
                totalRecords: action.payload?.pagination?.total || state.pagination?.totalRecords || state.shipmentData.length,
            };
        },
    },
});

export default slice.reducer;

// Actions

// ----------------------------------------------------------------------
// shipment api calls
export function getShipmentData({ page, size }) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.get(`/shipment-form/filter/view?page=${page}&size=${size}`);
            dispatch(slice.actions.getShipmentDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}