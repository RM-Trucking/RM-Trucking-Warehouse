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
  customerOptions: [],
  customerLoading: false,
  stationOptions: [],
  stationLoading: false,
  receiptNotes: [],
  receiptNotesLoading: false,
  receiptNotesSaving: false,
  receiptNotesError: null,
  auditLogs: [],
  auditLogsLoading: false,
  auditLogsError: null,
  updateReceiptLoading: false,
  updateReceiptError: null,
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
    sendToTellSystem: receipt.sendToTellSystem,
    status: formatStatus(receipt.status),
    carrier: receipt.carrierName || '',
    customer: [receipt.customerName, receipt.stationName].filter(Boolean).join(' | '),
    destination: receipt.destination || receipt.finalDestination || '',
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

const getNoteRowsFromResponse = (responseData) => {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData?.message?.data)) return responseData.message.data;
  if (responseData?.noteMessageId) return [responseData];
  if (responseData?.data?.noteMessageId) return [responseData.data];
  if (responseData?.message?.data?.noteMessageId) return [responseData.message.data];
  return [];
};

const getSpreadsheetFilename = (contentDisposition) => {
  const headerValue = String(contentDisposition || '');
  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  const filenameMatch = headerValue.match(/filename="?([^";]+)"?/i);
  const filename = utf8Match?.[1] || filenameMatch?.[1] || '';

  if (!filename) return 'warehouse-receipts.xlsx';

  try {
    return decodeURIComponent(filename);
  } catch (error) {
    return filename;
  }
};

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
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
      const { receiptId, location } = action.payload || {};

      state.receipts = state.receipts.map((row) =>
        String(row.receiptId || row.id) === String(receiptId)
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
    startUpdateWarehouseReceipt(state) {
      state.updateReceiptLoading = true;
      state.updateReceiptError = null;
    },
    updateWarehouseReceiptSuccess(state, action) {
      state.updateReceiptLoading = false;
      state.updateReceiptError = null;
      const updatedReceipt = action.payload?.receipt;
      const receiptId = action.payload?.receiptId || updatedReceipt?.receiptId;

      if (!receiptId) return;

      state.receipts = state.receipts.map((row) =>
        String(row.receiptId || row.id) === String(receiptId)
          ? {
              ...row,
              ...(updatedReceipt ? toGridRow({ ...(row.rawData || {}), ...updatedReceipt }) : {}),
              rawData: {
                ...(row.rawData || {}),
                ...(updatedReceipt || {}),
              },
            }
          : row
      );
    },
    updateWarehouseReceiptError(state, action) {
      state.updateReceiptLoading = false;
      state.updateReceiptError = action.payload?.message || action.payload || 'Failed to update warehouse receipt';
    },
    startCustomerLoading(state) {
      state.customerLoading = true;
      state.customerOptions = [];
    },
    getCustomerOptionsSuccess(state, action) {
      state.customerLoading = false;
      state.customerOptions = action.payload || [];
    },
    customerSearchError(state) {
      state.customerLoading = false;
      state.customerOptions = [];
    },
    startStationLoading(state) {
      state.stationLoading = true;
      state.stationOptions = [];
    },
    getStationOptionsSuccess(state, action) {
      state.stationLoading = false;
      state.stationOptions = action.payload || [];
    },
    stationSearchError(state) {
      state.stationLoading = false;
      state.stationOptions = [];
    },
    startReceiptNotesLoading(state) {
      state.receiptNotesLoading = true;
      state.receiptNotesError = null;
      state.receiptNotes = [];
    },
    getReceiptNotesSuccess(state, action) {
      state.receiptNotesLoading = false;
      state.receiptNotesError = null;
      state.receiptNotes = action.payload || [];
    },
    getReceiptNotesError(state, action) {
      state.receiptNotesLoading = false;
      state.receiptNotesError = action.payload?.message || action.payload || 'Failed to load warehouse receipt notes';
      state.receiptNotes = [];
    },
    startReceiptNotesSaving(state) {
      state.receiptNotesSaving = true;
      state.receiptNotesError = null;
    },
    postReceiptNoteSuccess(state, action) {
      state.receiptNotesSaving = false;
      state.receiptNotesError = null;
      const newNotes = action.payload || [];
      const existingIds = new Set(state.receiptNotes.map((note) => note.noteMessageId).filter(Boolean));
      const notesToAdd = newNotes.filter((note) => !note.noteMessageId || !existingIds.has(note.noteMessageId));

      state.receiptNotes = [...notesToAdd, ...state.receiptNotes];
    },
    postReceiptNoteError(state, action) {
      state.receiptNotesSaving = false;
      state.receiptNotesError = action.payload?.message || action.payload || 'Failed to add warehouse receipt note';
    },
    startAuditLogsLoading(state) {
      state.auditLogsLoading = true;
      state.auditLogsError = null;
      state.auditLogs = [];
    },
    getWarehouseReceiptAuditLogsSuccess(state, action) {
      state.auditLogsLoading = false;
      state.auditLogsError = null;
      state.auditLogs = action.payload || [];
    },
    getWarehouseReceiptAuditLogsError(state, action) {
      state.auditLogsLoading = false;
      state.auditLogsError = action.payload?.message || action.payload || 'Failed to load warehouse receipt status history';
      state.auditLogs = [];
    },
    hasError(state, action) {
      state.isLoading = false;
      state.error = action.payload?.message || action.payload || 'Failed to load warehouse receipts';
      state.receipts = [];
    },
  },
});

export default slice.reducer;

export function getWarehouseReceipts({ page = 1, pageSize = 10, status = '', receiptNumber = '', accounting = false, filters = {} } = {}) {
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

      params.set('accounting', accounting ? 'true' : 'false');

      Object.entries(filters || {}).forEach(([key, value]) => {
        const cleanValue = String(value ?? '').trim();
        if (cleanValue) {
          params.set(key, cleanValue);
        }
      });

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

export function exportWarehouseReceiptSpreadsheet({ status = '', receiptNumber = '', accounting = false, filters = {} } = {}) {
  return async () => {
    try {
      const params = new URLSearchParams();

      if (status) {
        params.set('status', status);
      }

      if (receiptNumber) {
        params.set('receiptNumber', receiptNumber);
      }

      params.set('accounting', accounting ? 'true' : 'false');

      Object.entries(filters || {}).forEach(([key, value]) => {
        const cleanValue = String(value ?? '').trim();
        if (cleanValue) {
          params.set(key, cleanValue);
        }
      });

      const response = await axios.get(`/warehouse-receipt/export-spreadsheet?${params.toString()}`, {
        responseType: 'blob',
      });
      const filename = getSpreadsheetFilename(response.headers?.['content-disposition']);

      downloadBlob(response.data, filename);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to export warehouse receipt spreadsheet';

      return { error: true, message: errorMessage };
    }
  };
}

export function updateWarehouseReceiptLocation({ receiptId, location } = {}) {
  return async () => {
    if (!receiptId) {
      return { error: true, message: 'Receipt ID is required to update location' };
    }

    try {
      const response = await axios.patch(`/warehouse-receipt/${encodeURIComponent(receiptId)}/location`, {
        location,
      });

      dispatch(slice.actions.updateWarehouseReceiptLocationSuccess({
        receiptId,
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

export function putWarehouseReceiptsOnAccountHold(receiptIds = []) {
  return async () => {
    const validReceiptIds = receiptIds.filter((receiptId) => receiptId !== null && receiptId !== undefined && receiptId !== '');

    if (!validReceiptIds.length) {
      return { error: true, message: 'At least one receipt ID is required for account hold' };
    }

    try {
      const response = await axios.put('/warehouse-receipt/account-hold', {
        receiptIds: validReceiptIds,
      });

      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to place warehouse receipt on account hold';

      return { error: true, message: errorMessage };
    }
  };
}

export function revertWarehouseReceiptsFromAccountHold(receiptIds = []) {
  return async () => {
    const validReceiptIds = receiptIds.filter((receiptId) => receiptId !== null && receiptId !== undefined && receiptId !== '');

    if (!validReceiptIds.length) {
      return { error: true, message: 'At least one receipt ID is required to revert account hold' };
    }

    try {
      const response = await axios.put('/warehouse-receipt/account-hold-revert', {
        receiptIds: validReceiptIds,
      });

      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to revert warehouse receipt from account hold';

      return { error: true, message: errorMessage };
    }
  };
}

export function updateWarehouseReceipt({ receiptId, payload } = {}) {
  return async () => {
    if (!receiptId) {
      return { error: true, message: 'Receipt ID is required to update warehouse receipt' };
    }

    dispatch(slice.actions.startUpdateWarehouseReceipt());

    try {
      const response = await axios.put(`/warehouse-receipt/${encodeURIComponent(receiptId)}`, payload);
      const responseReceipt = response.data?.data?.receipt || response.data?.data || response.data?.receipt || null;

      dispatch(slice.actions.updateWarehouseReceiptSuccess({
        receiptId,
        receipt: responseReceipt,
      }));

      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to update warehouse receipt';

      dispatch(slice.actions.updateWarehouseReceiptError(errorMessage));
      return { error: true, message: errorMessage };
    }
  };
}

export function searchWarehouseReceiptCustomers(searchTerm) {
  return async () => {
    const cleanSearchTerm = String(searchTerm || '').trim();

    if (!cleanSearchTerm) {
      dispatch(slice.actions.getCustomerOptionsSuccess([]));
      return;
    }

    dispatch(slice.actions.startCustomerLoading());

    try {
      const response = await axios.get(
        `/maintenance/customer/customer-dropdown?search=${encodeURIComponent(cleanSearchTerm)}`
      );
      const customers = Array.isArray(response.data?.data) ? response.data.data : [];

      dispatch(slice.actions.getCustomerOptionsSuccess(customers));
    } catch (error) {
      dispatch(slice.actions.customerSearchError());
    }
  };
}

export function searchWarehouseReceiptStations(customerId, searchTerm) {
  return async () => {
    const cleanCustomerId = String(customerId || '').trim();
    const cleanSearchTerm = String(searchTerm || '').trim();

    if (!cleanCustomerId) {
      dispatch(slice.actions.getStationOptionsSuccess([]));
      return;
    }

    dispatch(slice.actions.startStationLoading());

    try {
      const params = new URLSearchParams({
        customerId: cleanCustomerId,
      });

      if (cleanSearchTerm) {
        params.set('search', cleanSearchTerm);
      }

      const response = await axios.get(`/maintenance/customer/station-dropdown?${params.toString()}`);
      const stations = Array.isArray(response.data?.data) ? response.data.data : [];

      dispatch(slice.actions.getStationOptionsSuccess(stations));
    } catch (error) {
      dispatch(slice.actions.stationSearchError());
    }
  };
}

export function getWarehouseReceiptNotes(noteThreadId) {
  return async () => {
    const cleanNoteThreadId = String(noteThreadId ?? '').trim();

    if (!cleanNoteThreadId) {
      const message = 'Note thread ID is required to load notes';
      dispatch(slice.actions.getReceiptNotesError(message));
      return { error: true, message };
    }

    dispatch(slice.actions.startReceiptNotesLoading());

    try {
      const response = await axios.get(`/maintenance/note/${encodeURIComponent(cleanNoteThreadId)}`);
      const notes = getNoteRowsFromResponse(response.data);

      dispatch(slice.actions.getReceiptNotesSuccess(notes));
      return notes;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to load warehouse receipt notes';

      dispatch(slice.actions.getReceiptNotesError(errorMessage));
      return { error: true, message: errorMessage };
    }
  };
}

export function postWarehouseReceiptNote({ noteThreadId = 0, messageText = '' } = {}) {
  return async () => {
    const cleanMessageText = String(messageText || '').trim();

    if (!cleanMessageText) {
      const message = 'Notes is mandatory';
      dispatch(slice.actions.postReceiptNoteError(message));
      return { error: true, message };
    }

    dispatch(slice.actions.startReceiptNotesSaving());

    try {
      const response = await axios.post('/maintenance/note', {
        noteThreadId: Number(noteThreadId || 0),
        messageText: cleanMessageText,
      });
      const notes = getNoteRowsFromResponse(response.data);

      dispatch(slice.actions.postReceiptNoteSuccess(notes));
      return notes;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to add warehouse receipt note';

      dispatch(slice.actions.postReceiptNoteError(errorMessage));
      return { error: true, message: errorMessage };
    }
  };
}

export function getWarehouseReceiptAuditLogs(receiptId) {
  return async () => {
    if (!receiptId) {
      const message = 'Receipt ID is required to load status history';
      dispatch(slice.actions.getWarehouseReceiptAuditLogsError(message));
      return { error: true, message };
    }

    dispatch(slice.actions.startAuditLogsLoading());

    try {
      const response = await axios.get(`/warehouse-receipt/${encodeURIComponent(receiptId)}/audit-logs`);
      const logs = Array.isArray(response.data?.data) ? response.data.data : [];

      dispatch(slice.actions.getWarehouseReceiptAuditLogsSuccess(logs));
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to load warehouse receipt status history';

      dispatch(slice.actions.getWarehouseReceiptAuditLogsError(errorMessage));
      return { error: true, message: errorMessage };
    }
  };
}
