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
    createShipmentLoading: false,
    createShipmentError: null,
    scanFreightLoading: false,
    scanFreightError: null,
    signOffLoading: false,
    signOffError: null,
    completeShipmentLoading: false,
    completeShipmentError: null,
    splitApprovalLoading: false,
    splitApprovalError: null,
    addShipmentReceiptLoading: false,
    addShipmentReceiptError: null,
    shipmentData: [],
    shipmentSearchStr: '',
    exportAirlineOptions: [],
    exportAirlineLoading: false,
    exportAirlineError: null,
    shipmentReceiptOptionsByField: {},
    shipmentReceiptLoadingByField: {},
    shipmentReceiptErrorByField: {},
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
        setShipmentSearchStr(state, action) {
            state.shipmentSearchStr = action.payload;
        },
        startExportAirlineLoading(state) {
            state.exportAirlineLoading = true;
            state.exportAirlineError = null;
        },
        getExportAirlineOptionsSuccess(state, action) {
            state.exportAirlineLoading = false;
            state.exportAirlineOptions = action.payload;
        },
        getExportAirlineOptionsError(state, action) {
            state.exportAirlineLoading = false;
            state.exportAirlineOptions = [];
            state.exportAirlineError = action.payload;
        },
        startShipmentReceiptLoading(state, action) {
            const fieldKey = action.payload;
            state.shipmentReceiptLoadingByField[fieldKey] = true;
            state.shipmentReceiptErrorByField[fieldKey] = null;
        },
        getShipmentReceiptOptionsSuccess(state, action) {
            const { fieldKey, options } = action.payload;
            state.shipmentReceiptLoadingByField[fieldKey] = false;
            state.shipmentReceiptOptionsByField[fieldKey] = options;
        },
        getShipmentReceiptOptionsError(state, action) {
            const { fieldKey, error } = action.payload;
            state.shipmentReceiptLoadingByField[fieldKey] = false;
            state.shipmentReceiptOptionsByField[fieldKey] = [];
            state.shipmentReceiptErrorByField[fieldKey] = error;
        },
        startCreateShipment(state) {
            state.createShipmentLoading = true;
            state.createShipmentError = null;
        },
        createShipmentSuccess(state, action) {
            state.createShipmentLoading = false;
            state.createShipmentError = null;
            if (action.payload) {
                state.shipmentData.unshift(action.payload);
                state.pagination.totalRecords += 1;
            }
        },
        updateShipmentSuccess(state, action) {
            state.createShipmentLoading = false;
            state.createShipmentError = null;
            const updatedShipment = action.payload;
            const shipmentId = updatedShipment?.shipmentId || updatedShipment?.id;
            const index = state.shipmentData.findIndex((item) =>
                String(item.shipmentId || item.id) === String(shipmentId)
            );
            if (index !== -1) {
                state.shipmentData[index] = { ...state.shipmentData[index], ...updatedShipment };
            }
        },
        createShipmentError(state, action) {
            state.createShipmentLoading = false;
            state.createShipmentError = action.payload;
        },
        startScanFreight(state) {
            state.scanFreightLoading = true;
            state.scanFreightError = null;
        },
        scanFreightSuccess(state, action) {
            state.scanFreightLoading = false;
            state.scanFreightError = null;
            const updatedShipment = action.payload?.shipment || action.payload;
            const shipmentId = updatedShipment?.shipmentId || updatedShipment?.id;
            if (shipmentId) {
                const index = state.shipmentData.findIndex((item) =>
                    String(item.shipmentId || item.id) === String(shipmentId)
                );
                if (index !== -1) {
                    state.shipmentData[index] = { ...state.shipmentData[index], ...updatedShipment };
                }
            }
        },
        scanFreightError(state, action) {
            state.scanFreightLoading = false;
            state.scanFreightError = action.payload;
        },
        startSignOff(state) {
            state.signOffLoading = true;
            state.signOffError = null;
        },
        signOffSuccess(state, action) {
            state.signOffLoading = false;
            state.signOffError = null;
            const updatedShipment = action.payload?.shipment || action.payload;
            const shipmentId = updatedShipment?.shipmentId || updatedShipment?.id;
            if (shipmentId) {
                const index = state.shipmentData.findIndex((item) =>
                    String(item.shipmentId || item.id) === String(shipmentId)
                );
                if (index !== -1) {
                    state.shipmentData[index] = { ...state.shipmentData[index], ...updatedShipment };
                }
            }
        },
        signOffError(state, action) {
            state.signOffLoading = false;
            state.signOffError = action.payload;
        },
        startCompleteShipment(state) {
            state.completeShipmentLoading = true;
            state.completeShipmentError = null;
        },
        completeShipmentSuccess(state, action) {
            state.completeShipmentLoading = false;
            state.completeShipmentError = null;
            const updatedShipment = action.payload?.shipment || action.payload;
            const shipmentId = updatedShipment?.shipmentId || updatedShipment?.id;
            if (shipmentId) {
                const index = state.shipmentData.findIndex((item) =>
                    String(item.shipmentId || item.id) === String(shipmentId)
                );
                if (index !== -1) {
                    state.shipmentData[index] = { ...state.shipmentData[index], ...updatedShipment };
                }
            }
        },
        completeShipmentError(state, action) {
            state.completeShipmentLoading = false;
            state.completeShipmentError = action.payload;
        },
        startSplitApproval(state) {
            state.splitApprovalLoading = true;
            state.splitApprovalError = null;
        },
        splitApprovalSuccess(state, action) {
            state.splitApprovalLoading = false;
            state.splitApprovalError = null;
            const updatedShipment = action.payload?.shipment || action.payload;
            const shipmentId = updatedShipment?.shipmentId || updatedShipment?.id;
            if (shipmentId) {
                const index = state.shipmentData.findIndex((item) =>
                    String(item.shipmentId || item.id) === String(shipmentId)
                );
                if (index !== -1) {
                    state.shipmentData[index] = { ...state.shipmentData[index], ...updatedShipment };
                }
            }
        },
        splitApprovalError(state, action) {
            state.splitApprovalLoading = false;
            state.splitApprovalError = action.payload;
        },
        startAddShipmentReceipt(state) {
            state.addShipmentReceiptLoading = true;
            state.addShipmentReceiptError = null;
        },
        addShipmentReceiptSuccess(state, action) {
            state.addShipmentReceiptLoading = false;
            state.addShipmentReceiptError = null;
            const updatedShipment = action.payload?.shipment || action.payload;
            const shipmentId = updatedShipment?.shipmentId || updatedShipment?.id;
            if (shipmentId) {
                const index = state.shipmentData.findIndex((item) =>
                    String(item.shipmentId || item.id) === String(shipmentId)
                );
                if (index !== -1) {
                    state.shipmentData[index] = { ...state.shipmentData[index], ...updatedShipment };
                }
            }
        },
        addShipmentReceiptError(state, action) {
            state.addShipmentReceiptLoading = false;
            state.addShipmentReceiptError = action.payload;
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

export const { setShipmentSearchStr } = slice.actions;
export default slice.reducer;

// Actions

// ----------------------------------------------------------------------
// shipment api calls
export function getShipmentData({
    pageNo = 1,
    pageSize = 10,
    request = false,
    scanned = false,
    pickup = false,
    shipped = false,
} = {}) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const params = { page: pageNo, pageSize };
            if (request) params.request = true;
            if (scanned) params.scanned = true;
            if (pickup) params.pickup = true;
            if (shipped) params.shipped = true;
            const response = await axios.get('shipment', { params });
            dispatch(slice.actions.getShipmentDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}

export function getExportAirlineOptions() {
    return async () => {
        dispatch(slice.actions.startExportAirlineLoading());
        try {
            const response = await axios.get('maintenance/airline/export-dropdown');
            const options = Array.isArray(response.data?.data) ? response.data.data : [];
            dispatch(slice.actions.getExportAirlineOptionsSuccess(options));
        } catch (error) {
            dispatch(slice.actions.getExportAirlineOptionsError(error));
        }
    };
}

export function getShipmentReceiptOptions(receiptNumber, fieldKey) {
    return async () => {
        const cleanReceiptNumber = String(receiptNumber || '').trim();

        if (!cleanReceiptNumber) {
            dispatch(slice.actions.getShipmentReceiptOptionsSuccess({ fieldKey, options: [] }));
            return;
        }

        dispatch(slice.actions.startShipmentReceiptLoading(fieldKey));
        try {
            const response = await axios.post('warehouse-receipt/for-shipment', {
                receiptNumber: Number(cleanReceiptNumber),
            });
            const options = Array.isArray(response.data?.data) ? response.data.data : [];
            dispatch(slice.actions.getShipmentReceiptOptionsSuccess({ fieldKey, options }));
        } catch (error) {
            dispatch(slice.actions.getShipmentReceiptOptionsError({ fieldKey, error }));
        }
    };
}

export function postShipment(payload) {
    return async () => {
        dispatch(slice.actions.startCreateShipment());
        try {
            const response = await axios.post('shipment', payload);
            const shipment = response.data?.data?.shipment || response.data?.data || null;
            dispatch(slice.actions.createShipmentSuccess(shipment));
            return { success: true, data: shipment };
        } catch (error) {
            const message =
                error?.message ||
                error?.error ||
                (typeof error === 'string' ? error : 'Failed to create shipment');
            dispatch(slice.actions.createShipmentError(message));
            return { success: false, error: message };
        }
    };
}

export function updateShipment(shipmentId, payload) {
    return async () => {
        dispatch(slice.actions.startCreateShipment());
        try {
            const response = await axios.put(`shipment/${encodeURIComponent(shipmentId)}`, payload);
            const shipment = response.data?.data?.shipment || response.data?.data || { ...payload, shipmentId };
            dispatch(slice.actions.updateShipmentSuccess(shipment));
            return { success: true, data: shipment };
        } catch (error) {
            const message =
                error?.message ||
                error?.error ||
                (typeof error === 'string' ? error : 'Failed to update shipment');
            dispatch(slice.actions.createShipmentError(message));
            return { success: false, error: message };
        }
    };
}

export function scanShipmentFreight({ id, barcodeValue }) {
    return async () => {
        dispatch(slice.actions.startScanFreight());
        try {
            const response = await axios.get('shipment/scan-freight', {
                params: { id, barcodeValue },
            });
            const data = response.data?.data || response.data;
            dispatch(slice.actions.scanFreightSuccess(data));
            return { success: true, data };
        } catch (error) {
            const message = error?.message || error?.error || 'Failed to scan freight';
            dispatch(slice.actions.scanFreightError(message));
            return { success: false, error: message };
        }
    };
}

export function unscanShipmentFreight({ id, barcodeValue }) {
    return async () => {
        dispatch(slice.actions.startScanFreight());
        try {
            const response = await axios.get('shipment/unscan-freight', {
                params: { id, barcodeValue },
            });
            const data = response.data?.data || response.data;
            dispatch(slice.actions.scanFreightSuccess(data));
            return { success: true, data };
        } catch (error) {
            const message = error?.message || error?.error || 'Failed to unscan freight';
            dispatch(slice.actions.scanFreightError(message));
            return { success: false, error: message };
        }
    };
}

export function signOffShipment(shipmentId) {
    return async () => {
        dispatch(slice.actions.startSignOff());
        try {
            const response = await axios.post('shipment/sign-off', { shipmentId });
            const data = response.data?.data || response.data;
            dispatch(slice.actions.signOffSuccess(data));
            return { success: true, data };
        } catch (error) {
            const message = error?.message || error?.error || 'Failed to sign off shipment';
            dispatch(slice.actions.signOffError(message));
            return { success: false, error: message };
        }
    };
}

export function completeShipment(shipmentId) {
    return async () => {
        dispatch(slice.actions.startCompleteShipment());
        try {
            const response = await axios.post('shipment/complete', { shipmentId });
            const data = response.data?.data || response.data;
            dispatch(slice.actions.completeShipmentSuccess(data));
            return { success: true, data };
        } catch (error) {
            const message = error?.message || error?.error || 'Failed to complete shipment';
            dispatch(slice.actions.completeShipmentError(message));
            return { success: false, error: message };
        }
    };
}

export function splitApprovalShipment(shipmentId) {
    return async () => {
        dispatch(slice.actions.startSplitApproval());
        try {
            const response = await axios.post('shipment/split-approval', { shipmentId });
            const data = response.data?.data || response.data;
            dispatch(slice.actions.splitApprovalSuccess(data));
            return { success: true, data, message: response.data?.message };
        } catch (error) {
            const message = error?.message || error?.error || 'Failed to submit split approval';
            dispatch(slice.actions.splitApprovalError(message));
            return { success: false, error: message };
        }
    };
}

export function addShipmentReceipt({ shipmentId, receiptId }) {
    return async () => {
        dispatch(slice.actions.startAddShipmentReceipt());
        try {
            const response = await axios.put(
                `shipment/${encodeURIComponent(shipmentId)}/receipts/${encodeURIComponent(receiptId)}`
            );
            const data = response.data?.data || response.data;
            dispatch(slice.actions.addShipmentReceiptSuccess(data));
            return { success: true, data, message: response.data?.message };
        } catch (error) {
            const message = error?.message || error?.error || 'Failed to add receipt to shipment';
            dispatch(slice.actions.addShipmentReceiptError(message));
            return { success: false, error: message };
        }
    };
}
