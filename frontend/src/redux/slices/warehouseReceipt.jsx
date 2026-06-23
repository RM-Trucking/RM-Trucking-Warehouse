import { createSlice } from '@reduxjs/toolkit';
import axios from '../../utils/axios';
import { dispatch } from '../store';

const initialState = {
  isLoading: false,
  error: null,
  receipts: [],
  pagination: {
    page: 1,
    pageSize: 10,
    totalRecords: 0,
  },
  countList: {},
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).split(' ')[0] || '';
  return date.toLocaleDateString('en-US');
};

const formatStatus = (value) =>
  String(value || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');

const toGridRow = (receipt = {}) => {
  const firstFreight = receipt.freightInformation?.[0] || {};
  const rateValue = receipt.rateInformation?.finalRate;

  return {
    id: receipt.receiptId || receipt.receiptNumber,
    receiptId: receipt.receiptId,
    receiptNumber: receipt.receiptNumber,
    status: formatStatus(receipt.status),
    carrier: receipt.carrierName || '',
    customer: [receipt.customerName, receipt.stationName].filter(Boolean).join(' | '),
    proNumber: receipt.proNumber || '',
    idVerification: receipt.verificationId || '',
    location: receipt.location || '',
    rate: rateValue === null || rateValue === undefined ? '' : Number(rateValue).toFixed(2),
    createdDate: formatDate(receipt.createdAt || receipt.receiptDate),
    receivedBy: receipt.receivedBy || '',
    pieces: String(firstFreight.pieces ?? receipt.piecesInland ?? ''),
    type: firstFreight.type || '',
    length: String(firstFreight.length ?? ''),
    width: String(firstFreight.width ?? ''),
    height: String(firstFreight.height ?? ''),
    weight: String(firstFreight.weight ?? receipt.weightInland ?? ''),
    invoiceNo: receipt.invoiceNumber || '',
    poNumber: receipt.poNumber || '',
    customerRefNo: receipt.customerRefNumber || '',
    receiptType: receipt.receiptType || '',
    rawData: receipt,
  };
};

const slice = createSlice({
  name: 'warehouseReceipt',
  initialState,
  reducers: {
    startLoading(state) {
      state.isLoading = true;
      state.error = null;
    },
    getWarehouseReceiptsSuccess(state, action) {
      const payload = action.payload || {};

      state.isLoading = false;
      state.error = null;
      state.receipts = payload.data || [];
      state.pagination = {
        page: payload.pagination?.page || state.pagination.page,
        pageSize: payload.pagination?.pageSize || state.pagination.pageSize,
        totalRecords:
          payload.pagination?.totalRecords ||
          payload.pagination?.total ||
          payload.pagination?.count ||
          payload.data?.length ||
          0,
      };
      state.countList = payload.countList || {};
    },
    updateWarehouseReceiptLocationSuccess(state, action) {
      const { receiptNumber, location } = action.payload || {};

      state.receipts = state.receipts.map((row) =>
        String(row.receiptNumber) === String(receiptNumber)
          ? {
              ...row,
              location,
              rawData: {
                ...(row.rawData || {}),
                location,
              },
            }
          : row
      );
    },
    hasError(state, action) {
      state.isLoading = false;
      state.error = action.payload?.message || action.payload || 'Failed to load warehouse receipts';
      state.receipts = [];
    },
  },
});

export default slice.reducer;

export function getWarehouseReceipts({ page = 1, pageSize = 10, status = '', receiptNumber = '' } = {}) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (status) {
        params.set('status', status);
      }

      if (receiptNumber) {
        params.set('receiptNumber', receiptNumber);
      }

      const response = await axios.get(`/warehouse-receipt?${params.toString()}`);
      const responseData = response.data || {};
      const sourceRows = Array.isArray(responseData.data) ? responseData.data : [];

      dispatch(slice.actions.getWarehouseReceiptsSuccess({
        data: sourceRows.map(toGridRow),
        pagination: responseData.pagination,
        countList: responseData.countList,
      }));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}

export function updateWarehouseReceiptLocation({ receiptNumber, location } = {}) {
  return async () => {
    if (!receiptNumber) {
      return { error: true, message: 'Receipt number is required to update location' };
    }

    try {
      const response = await axios.put(`/warehouse-receipt/${encodeURIComponent(receiptNumber)}/location`, {
        location,
      });

      dispatch(slice.actions.updateWarehouseReceiptLocationSuccess({
        receiptNumber,
        location,
      }));

      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to update warehouse receipt location';

      return { error: true, message: errorMessage };
    }
  };
}
