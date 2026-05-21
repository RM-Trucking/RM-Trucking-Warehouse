import { createSlice } from '@reduxjs/toolkit';
import axios from '../../utils/axios';
import { dispatch } from '../store';

const initialState = {
    warehouseReceiptSearch: {
        loading: false,
        data: null,
        error: null,
        found: false
    },
    cargoApiDropdown: {
        loading: false,
        data: [],
        error: null
    },
    printersDropdown: {
        loading: false,
        data: [],
        error: null
    },
    cargoApiDimensions: {
        loading: false,
        data: null,
        error: null,
        selectedApiId: null
    },
    warehouseReceiptBatch: {
        loading: false,
        data: null,
        error: null
    },
    warehouseCheckInDraft: null,
    warehouseCheckInDrafts: {}
};

const normalizeDropdownOptions = (payload) => {
    const source = payload?.data?.data || payload?.data?.results || payload?.data || payload?.results || payload;
    const options = Array.isArray(source) ? source : source?.items || source?.options || source?.data || [];

    return Array.isArray(options) ? options : [];
};

const getCargoApiDimensionsMessage = (responseData) =>
    responseData?.message ||
    responseData?.data?.Responses?.Dimension?.description ||
    responseData?.data?.responses?.dimension?.description ||
    responseData?.Responses?.Dimension?.description ||
    responseData?.responses?.dimension?.description ||
    '';

const isCargoApiDimensionWarning = (responseData) => {
    const dimension = responseData?.data?.Responses?.Dimension || responseData?.Responses?.Dimension;
    return Boolean(dimension?.code && !dimension?.value);
};

const slice = createSlice({
    name: 'warehouse',
    initialState,
    reducers: {
        // Warehouse Receipt Search actions
        startReceiptSearch(state) {
            state.warehouseReceiptSearch.loading = true;
            state.warehouseReceiptSearch.error = null;
            state.warehouseReceiptSearch.data = null;
            state.warehouseReceiptSearch.found = false;
        },
        receiptSearchSuccess(state, action) {
            state.warehouseReceiptSearch.loading = false;
            state.warehouseReceiptSearch.data = action.payload;
            state.warehouseReceiptSearch.found = true;
            state.warehouseReceiptSearch.error = null;
        },
        receiptSearchNotFound(state) {
            state.warehouseReceiptSearch.loading = false;
            state.warehouseReceiptSearch.data = null;
            state.warehouseReceiptSearch.found = false;
            state.warehouseReceiptSearch.error = null;
        },
        receiptSearchError(state, action) {
            state.warehouseReceiptSearch.loading = false;
            state.warehouseReceiptSearch.data = null;
            state.warehouseReceiptSearch.found = false;
            state.warehouseReceiptSearch.error = action.payload || 'Error searching warehouse receipt';
        },
        clearReceiptSearch(state) {
            state.warehouseReceiptSearch.loading = false;
            state.warehouseReceiptSearch.data = null;
            state.warehouseReceiptSearch.error = null;
            state.warehouseReceiptSearch.found = false;
        },
        startCargoApiDropdown(state) {
            state.cargoApiDropdown.loading = true;
            state.cargoApiDropdown.error = null;
        },
        cargoApiDropdownSuccess(state, action) {
            state.cargoApiDropdown.loading = false;
            state.cargoApiDropdown.data = action.payload;
            state.cargoApiDropdown.error = null;
        },
        cargoApiDropdownError(state, action) {
            state.cargoApiDropdown.loading = false;
            state.cargoApiDropdown.data = [];
            state.cargoApiDropdown.error = action.payload || 'Failed to load package details';
        },
        clearCargoApiDropdown(state) {
            state.cargoApiDropdown.loading = false;
            state.cargoApiDropdown.data = [];
            state.cargoApiDropdown.error = null;
        },
        startPrintersDropdown(state) {
            state.printersDropdown.loading = true;
            state.printersDropdown.error = null;
        },
        printersDropdownSuccess(state, action) {
            state.printersDropdown.loading = false;
            state.printersDropdown.data = action.payload;
            state.printersDropdown.error = null;
        },
        printersDropdownError(state, action) {
            state.printersDropdown.loading = false;
            state.printersDropdown.data = [];
            state.printersDropdown.error = action.payload || 'Failed to load printers';
        },
        startCargoApiDimensions(state, action) {
            state.cargoApiDimensions.loading = true;
            state.cargoApiDimensions.error = null;
            state.cargoApiDimensions.selectedApiId = action.payload;
        },
        cargoApiDimensionsSuccess(state, action) {
            state.cargoApiDimensions.loading = false;
            state.cargoApiDimensions.data = action.payload;
            state.cargoApiDimensions.error = null;
        },
        cargoApiDimensionsError(state, action) {
            state.cargoApiDimensions.loading = false;
            state.cargoApiDimensions.data = null;
            state.cargoApiDimensions.error = action.payload || 'Failed to load cargo dimensions';
        },
        startWarehouseReceiptBatch(state) {
            state.warehouseReceiptBatch.loading = true;
            state.warehouseReceiptBatch.data = null;
            state.warehouseReceiptBatch.error = null;
        },
        warehouseReceiptBatchSuccess(state, action) {
            state.warehouseReceiptBatch.loading = false;
            state.warehouseReceiptBatch.data = action.payload;
            state.warehouseReceiptBatch.error = null;
        },
        warehouseReceiptBatchError(state, action) {
            state.warehouseReceiptBatch.loading = false;
            state.warehouseReceiptBatch.data = null;
            state.warehouseReceiptBatch.error = action.payload || 'Failed to submit warehouse receipts';
        },
        setWarehouseCheckInDraft(state, action) {
            const draftKey = action.payload?.draftKey || 'regular';
            state.warehouseCheckInDraft = action.payload;
            state.warehouseCheckInDrafts[draftKey] = action.payload?.draft || action.payload;
        },
        clearWarehouseCheckInDraft(state, action) {
            const draftKey = action.payload?.draftKey;
            if (draftKey) {
                delete state.warehouseCheckInDrafts[draftKey];
                if (state.warehouseCheckInDraft?.draftKey === draftKey) {
                    state.warehouseCheckInDraft = null;
                }
                return;
            }

            state.warehouseCheckInDraft = null;
            state.warehouseCheckInDrafts = {};
        }
    }
});

export default slice.reducer;

// Search Warehouse Receipt by PRO or ID
export function searchWarehouseReceipt(searchValue, searchBy) {
    return async () => {
        dispatch(slice.actions.startReceiptSearch());
        try {
            if (!searchValue || !searchValue.trim()) {
                dispatch(slice.actions.receiptSearchError('Please enter a search value'));
                return;
            }

            if (!searchBy) {
                dispatch(slice.actions.receiptSearchError('Please select a search type'));
                return;
            }

            // Determine the searchBy parameter based on dropdown selection
            const searchByParam = searchBy === 'pro' ? 'proNumber' : 'receiptNumber';

            const response = await axios.get(`/warehouse-receipt/${searchValue}?searchBy=${searchByParam}`);

            if (response.data?.success && response.data?.data) {
                // Transform the API response to the expected format
                let receipts = response.data.data;
                console.log('API Response receipts:', receipts);
                console.log('Is array?', Array.isArray(receipts));
                console.log('Length:', receipts?.length);

                // Handle case where data might be a single object instead of array
                if (!Array.isArray(receipts) && receipts) {
                    receipts = [receipts];
                    console.log('Converted single object to array:', receipts);
                }

                if (Array.isArray(receipts) && receipts.length > 0) {
                    // Map each receipt to the table row format
                    const rows = receipts.map((receipt, index) => ({
                        id: receipt.receiptId || receipt.id || index,
                        sno: String(index + 1).padStart(2, '0'),
                        receiptNumber: receipt.receiptNumber,
                        carrier: receipt.carrierName || '-',
                        customer: receipt.customerName ? `${receipt.customerName} | ${receipt.stationName || '-'}` : '-',
                        // Include original data for proceed action
                        ...receipt
                    }));

                    console.log('Transformed rows:', rows);

                    // Group by PRO number (if there are multiple PROs, use the first one)
                    const proNumber = receipts[0]?.proNumber || searchValue;

                    const transformedData = {
                        proNumber,
                        rows
                    };

                    console.log('Final transformed data:', transformedData);
                    dispatch(slice.actions.receiptSearchSuccess(transformedData));
                    return transformedData;
                } else if (Array.isArray(receipts) && receipts.length === 0) {
                    // Handle empty results - still consider it a successful search
                    console.log('Empty results - no rows found');
                    const transformedData = {
                        proNumber: searchValue,
                        rows: []
                    };
                    dispatch(slice.actions.receiptSearchSuccess(transformedData));
                    return transformedData;
                } else {
                    console.log('No rows found or not an array');
                    dispatch(slice.actions.receiptSearchNotFound());
                    return null;
                }
            } else if (!response.data?.success && response.data?.message) {
                const errorMessage = response.data.message;
                dispatch(slice.actions.receiptSearchError(errorMessage));
                return { error: true, message: errorMessage };
            } else {
                dispatch(slice.actions.receiptSearchNotFound());
                return null;
            }
        } catch (error) {
            console.error('Error searching warehouse receipt:', error);
            let errorMessage = 'Error searching warehouse receipt';

            if (error.response?.status === 404) {
                dispatch(slice.actions.receiptSearchNotFound());
                return null;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
                dispatch(slice.actions.receiptSearchError(errorMessage));
                return { error: true, message: errorMessage };
            } else {
                errorMessage = error.message || 'Error searching warehouse receipt';
                dispatch(slice.actions.receiptSearchError(errorMessage));
                return { error: true, message: errorMessage };
            }
        }
    };
}

// Create temporary Warehouse Receipt
export function createTempWarehouseReceipt(payload) {
    return async () => {
        try {
            const response = await axios.post('/warehouse-receipt/temp', payload);
            return response.data;
        } catch (error) {
            console.error('Error creating temporary warehouse receipt:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error creating temporary warehouse receipt';
            return { error: true, message: errorMessage };
        }
    };
}

// Submit Warehouse Receipt batch
export function submitWarehouseReceiptBatch(payload) {
    return async () => {
        dispatch(slice.actions.startWarehouseReceiptBatch());
        try {
            const response = await axios.post('/warehouse-receipt/batch', payload);
            dispatch(slice.actions.warehouseReceiptBatchSuccess(response.data));
            return response.data;
        } catch (error) {
            console.error('Error submitting warehouse receipt batch:', error);
            const errorMessage = error.response?.data?.message || error.message || error.error || 'Failed to submit warehouse receipts';
            dispatch(slice.actions.warehouseReceiptBatchError(errorMessage));
            return { error: true, message: errorMessage };
        }
    };
}

// Fetch Cargo API dropdown values
export function fetchCargoApiDropdown() {
    return async () => {
        dispatch(slice.actions.startCargoApiDropdown());
        try {
            const response = await axios.get('/maintenance/devices/cargo-api-dropdown');
            const options = normalizeDropdownOptions(response);
            dispatch(slice.actions.cargoApiDropdownSuccess(options));
            return options;
        } catch (error) {
            console.error('Error fetching cargo API dropdown:', error);
            const errorMessage = error.response?.data?.message || error.message || error.error || 'Failed to load package details';
            dispatch(slice.actions.cargoApiDropdownError(errorMessage));
            return { error: true, message: errorMessage };
        }
    };
}

// Fetch printer dropdown values
export function fetchPrintersDropdown() {
    return async () => {
        dispatch(slice.actions.startPrintersDropdown());
        try {
            const response = await axios.get('/maintenance/devices/printers-dropdown');
            const options = normalizeDropdownOptions(response);
            dispatch(slice.actions.printersDropdownSuccess(options));
            return options;
        } catch (error) {
            console.error('Error fetching printers dropdown:', error);
            const errorMessage = error.response?.data?.message || error.message || error.error || 'Failed to load printers';
            dispatch(slice.actions.printersDropdownError(errorMessage));
            return { error: true, message: errorMessage };
        }
    };
}

// Fetch dimensions for selected Cargo API option
export function fetchCargoApiDimensions(apiId) {
    return async () => {
        dispatch(slice.actions.startCargoApiDimensions(apiId));
        try {
            const response = await axios.get(`/maintenance/devices/cargo-api-dimensions?apiId=${apiId}`);
            const responseData = response.data || {};
            const dimensions = responseData.data || responseData;

            if (responseData.success === false) {
                const errorMessage = getCargoApiDimensionsMessage(responseData) || 'Failed to load cargo dimensions';
                dispatch(slice.actions.cargoApiDimensionsError(errorMessage));
                return { error: true, message: errorMessage, data: dimensions };
            }

            dispatch(slice.actions.cargoApiDimensionsSuccess(dimensions));
            return {
                success: responseData.success,
                message: getCargoApiDimensionsMessage(responseData),
                warning: isCargoApiDimensionWarning(responseData),
                data: dimensions
            };
        } catch (error) {
            console.error('Error fetching cargo API dimensions:', error);
            const errorMessage = error.response?.data?.message || error.message || error.error || 'Failed to load cargo dimensions';
            dispatch(slice.actions.cargoApiDimensionsError(errorMessage));
            return { error: true, message: errorMessage };
        }
    };
}

// Clear search state
export function clearReceiptSearch() {
    return async () => {
        dispatch(slice.actions.clearReceiptSearch());
    };
}

export function clearCargoApiDropdown() {
    return async () => {
        dispatch(slice.actions.clearCargoApiDropdown());
    };
}

export function setWarehouseCheckInDraft(draft, draftKey = 'regular') {
    return async () => {
        dispatch(slice.actions.setWarehouseCheckInDraft({ draftKey, draft }));
    };
}

export function clearWarehouseCheckInDraft(draftKey) {
    return async () => {
        dispatch(slice.actions.clearWarehouseCheckInDraft({ draftKey }));
    };
}
