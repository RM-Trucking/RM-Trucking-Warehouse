import { createSlice } from '@reduxjs/toolkit';
import axios from '../../utils/axios';
import { dispatch } from '../store';

const initialState = {
  receipt: null,
  scannedFreightBarcodes: [],
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
      state.scannedFreightBarcodes = [];
      state.error = null;
    },
    receiptLookupSuccess(state, action) {
      state.loading = false;
      state.receipt = action.payload.receipt;
      state.scannedFreightBarcodes = action.payload.scannedFreightBarcodeValue
        ? [action.payload.scannedFreightBarcodeValue]
        : [];
      state.error = null;
    },
    receiptLookupError(state, action) {
      state.loading = false;
      state.receipt = null;
      state.scannedFreightBarcodes = [];
      state.error = action.payload;
    },
    addScannedFreightBarcode(state, action) {
      const freightBarcodeValue = String(action.payload || '').trim().toUpperCase();
      if (freightBarcodeValue && !state.scannedFreightBarcodes.includes(freightBarcodeValue)) {
        state.scannedFreightBarcodes.push(freightBarcodeValue);
      }
    },
    clearReceiptLookup(state) {
      state.receipt = null;
      state.scannedFreightBarcodes = [];
      state.loading = false;
      state.error = null;
    },
  },
});

export default slice.reducer;

export const { addScannedFreightBarcode, clearReceiptLookup } = slice.actions;

export function getLocationScanReceipt(receiptNumber) {
  return async () => {
    const scannedBarcode = String(receiptNumber || '').trim();
    const [receiptBarcode, ...freightBarcodeParts] = scannedBarcode.split('-');
    const cleanReceiptNumber = receiptBarcode.trim();
    const scannedFreightBarcodeValue = freightBarcodeParts.join('-').trim().toUpperCase();
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
      dispatch(slice.actions.receiptLookupSuccess({
        receipt: normalizedReceipt,
        scannedFreightBarcodeValue,
      }));
      return { success: true, data: normalizedReceipt, scannedFreightBarcodeValue };
    } catch (error) {
      const message = error?.message || error?.error || `Warehouse receipt ${cleanReceiptNumber} was not found.`;
      dispatch(slice.actions.receiptLookupError(message));
      return { error: true, message };
    }
  };
}
