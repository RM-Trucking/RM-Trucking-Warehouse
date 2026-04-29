import { createSlice } from '@reduxjs/toolkit';
import axios from '../../utils/axios';
import { dispatch } from '../store';

const initialState = {
    proVerification: {
        loading: false,
        data: null,
        error: null,
        found: false
    },
    checkInSubmission: {
        loading: false,
        success: false,
        error: null
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
        },
        // Check-In Submission actions
        startCheckInSubmission(state) {
            state.checkInSubmission.loading = true;
            state.checkInSubmission.success = false;
            state.checkInSubmission.error = null;
        },
        checkInSubmissionSuccess(state, action) {
            state.checkInSubmission.loading = false;
            state.checkInSubmission.success = true;
            state.checkInSubmission.error = null;
        },
        checkInSubmissionError(state, action) {
            state.checkInSubmission.loading = false;
            state.checkInSubmission.success = false;
            state.checkInSubmission.error = action.payload || 'Error submitting check-in';
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
            } else if (!response.data?.success && response.data?.message) {
                // Return error message for handling in component
                const errorMessage = response.data.message;
                dispatch(slice.actions.proVerificationError(errorMessage));
                return { error: true, message: errorMessage };
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
                return null;
            } else if (error.response?.data?.message) {
                // Return API error message (duplicate, conflict, etc.)
                errorMessage = error.response.data.message;
                dispatch(slice.actions.proVerificationError(errorMessage));
                return { error: true, message: errorMessage };
            } else {
                errorMessage = error.message || 'Error verifying PRO number';
                dispatch(slice.actions.proVerificationError(errorMessage));
                return { error: true, message: errorMessage };
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

// Submit Driver Check-In API
export function submitDriverCheckIn(checkInData) {
    return async () => {
        dispatch(slice.actions.startCheckInSubmission());
        try {
            const payload = {
                header: {
                    carrierId: checkInData.carrierId,
                    doorNo: checkInData.doorNo,
                    firstIdType: checkInData.firstIdType,
                    firstIdPhotoMatch: checkInData.firstIdPhotoMatch ? 'Y' : 'N',
                    secondIdType: 'NA',
                    secondIdPhotoMatch: 'N',
                    driverName: checkInData.driverName,
                    driverSignature: checkInData.driverSignature,
                    verifiedByEmployee: checkInData.verifiedByEmployee
                },
                freightDetails: checkInData.freightDetails.map(detail => ({
                    customerId: detail.customerId,
                    stationId: detail.stationId,
                    proNumber: detail.proNumber,
                    pieces: detail.pieces,
                    weight: detail.weight,
                    shipper: detail.shipper,
                    proDetailId: detail.proDetailId || 0,
                    toEmails: detail.toEmails || ['demo1@gmail.com', 'demo2@gmail.com']
                }))
            };

            console.log('Submitting check-in payload:', payload);

            const response = await axios.post('/id-verification', payload);

            if (response.data?.success) {
                dispatch(slice.actions.checkInSubmissionSuccess(response.data.data));
                return response.data.data;
            } else {
                dispatch(slice.actions.checkInSubmissionError('Failed to submit check-in'));
                throw new Error('Failed to submit check-in');
            }
        } catch (error) {
            console.error('Error submitting check-in:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error submitting check-in';
            dispatch(slice.actions.checkInSubmissionError(errorMessage));
            throw error;
        }
    };
}
