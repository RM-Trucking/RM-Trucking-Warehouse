import { createSlice } from '@reduxjs/toolkit';
import axios from '../../utils/axios';
import { dispatch } from '../store';

const initialState = {
    warehouseReceiptSearch: {
        loading: false,
        data: null,
        error: null,
        found: false
    }
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

// Clear search state
export function clearReceiptSearch() {
    return async () => {
        dispatch(slice.actions.clearReceiptSearch());
    };
}
