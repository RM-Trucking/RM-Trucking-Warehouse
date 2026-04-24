import { createSlice } from '@reduxjs/toolkit';
import axios from '../../utils/axios';
import { dispatch } from '../store';

const initialState = {
    proVerification: {
        loading: false,
        data: null,
        error: null,
        found: false
    }
};

const slice = createSlice({
    name: 'driverCheckIn',
    initialState,
    reducers: {
        // PRO Verification actions
        startProVerification(state) {
            state.proVerification.loading = true;
            state.proVerification.error = null;
            state.proVerification.data = null;
            state.proVerification.found = false;
        },
        proVerificationSuccess(state, action) {
            state.proVerification.loading = false;
            state.proVerification.data = action.payload;
            state.proVerification.found = true;
            state.proVerification.error = null;
        },
        proVerificationNotFound(state) {
            state.proVerification.loading = false;
            state.proVerification.data = null;
            state.proVerification.found = false;
            state.proVerification.error = null;
        },
        proVerificationError(state, action) {
            state.proVerification.loading = false;
            state.proVerification.data = null;
            state.proVerification.found = false;
            state.proVerification.error = action.payload || 'Error verifying PRO number';
        },
        clearProVerification(state) {
            state.proVerification.loading = false;
            state.proVerification.data = null;
            state.proVerification.error = null;
            state.proVerification.found = false;
        }
    }
});

export default slice.reducer;

// Verify PRO Number API
export function verifyProNumber(carrierId, proNumber) {
    return async () => {
        dispatch(slice.actions.startProVerification());
        try {
            if (!carrierId) {
                dispatch(slice.actions.proVerificationError('Please select a carrier'));
                return;
            }

            if (!proNumber || !proNumber.trim()) {
                dispatch(slice.actions.proVerificationError('Please enter a PRO number'));
                return;
            }

            const response = await axios.get(`/enroute/verify?carrierId=${carrierId}&proNumber=${proNumber}`);

            if (response.data?.success && response.data?.data) {
                dispatch(slice.actions.proVerificationSuccess(response.data.data));
                return response.data.data;
            } else {
                dispatch(slice.actions.proVerificationNotFound());
                return null;
            }
        } catch (error) {
            console.error('Error verifying PRO number:', error);
            let errorMessage = 'Error verifying PRO number';

            if (error.response?.status === 404) {
                // PRO not found
                dispatch(slice.actions.proVerificationNotFound());
            } else {
                errorMessage = error.response?.data?.message || error.message || 'Error verifying PRO number';
                dispatch(slice.actions.proVerificationError(errorMessage));
            }
        }
    };
}

// Clear verification state
export function clearProVerification() {
    return async () => {
        dispatch(slice.actions.clearProVerification());
    };
}
