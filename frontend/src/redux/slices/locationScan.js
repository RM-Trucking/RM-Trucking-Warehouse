import { createSlice } from '@reduxjs/toolkit';
import axios from '../../utils/axios';
import { dispatch } from '../store';

const initialState = {
  receipt: null,
  loading: false,
  error: null,
};

const slice = createSlice({
  name: 'locationScan',
  initialState,
  reducers: {
    startReceiptLookup(state) {
      state.loading = true;
      state.receipt = null;
      state.error = null;
    },
    receiptLookupSuccess(state, action) {
      state.loading = false;
      state.receipt = action.payload;
      state.error = null;
    },
    receiptLookupError(state, action) {
      state.loading = false;
      state.receipt = null;
      state.error = action.payload;
    },
    clearReceiptLookup(state) {
      state.receipt = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export default slice.reducer;

export const { clearReceiptLookup } = slice.actions;

export function getLocationScanReceipt(receiptNumber) {
  return async () => {
    const cleanReceiptNumber = String(receiptNumber || '').trim();
    if (!cleanReceiptNumber) return { error: true, message: 'Receipt number is required.' };

    dispatch(slice.actions.startReceiptLookup());
    try {
      const response = await axios.get(
        `/warehouse-receipt/${encodeURIComponent(cleanReceiptNumber)}/with-freight?searchBy=receiptNumber`
      );
      const payload = response.data?.data !== undefined ? response.data.data : response.data;
      const receiptPayload = payload?.warehouseReceipt || payload?.receipt || payload;
      const receipt = Array.isArray(receiptPayload) ? receiptPayload[0] : receiptPayload;

      if (!receipt) {
        const message = 'No data found.';
        dispatch(slice.actions.receiptLookupError(message));
        return { error: true, notFound: true, message };
      }

      if (response.data?.success === false) {
        const message = response.data?.message || `Warehouse receipt ${cleanReceiptNumber} was not found.`;
        dispatch(slice.actions.receiptLookupError(message));
        return { error: true, message };
      }

      const normalizedReceipt = {
        ...receipt,
        id: receipt.receiptId || receipt.id,
        receiptNumber: receipt.receiptNumber || receipt.receiptNo || receipt.verificationId || cleanReceiptNumber,
      };
      dispatch(slice.actions.receiptLookupSuccess(normalizedReceipt));
      return { success: true, data: normalizedReceipt };
    } catch (error) {
      const message = error?.message || error?.error || `Warehouse receipt ${cleanReceiptNumber} was not found.`;
      dispatch(slice.actions.receiptLookupError(message));
      return { error: true, message };
    }
  };
}
